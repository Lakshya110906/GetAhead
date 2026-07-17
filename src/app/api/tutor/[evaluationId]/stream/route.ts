import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTutorSystemPrompt, buildConversationHistory } from "@/lib/tutor-context";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

type RouteParams = { params: Promise<{ evaluationId: string }> };

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Simple rate limiting: 30 messages per 60 seconds per user
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `tutor:${userId}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + 60 * 1000);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });
    if (!existing) {
      await prisma.rateLimit.create({ data: { key, count: 1, resetAt } });
      return true;
    }
    if (existing.resetAt < now) {
      await prisma.rateLimit.update({ where: { key }, data: { count: 1, resetAt } });
      return true;
    }
    if (existing.count >= 30) return false;
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  } catch {
    return true; // Fail open if DB error
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { evaluationId } = await params;

  let userMessage: string;
  try {
    const body = await req.json();
    userMessage = body.message?.trim();
    if (!userMessage) throw new Error("Empty message");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  // Rate limit check
  const allowed = await checkRateLimit(userId);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), { status: 429 });
  }

  // Verify ownership and load full evaluation context
  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, userId },
  });
  if (!evaluation) {
    return new Response(JSON.stringify({ error: "Evaluation not found" }), { status: 404 });
  }

  // Parse stored JSON fields
  const marksBreakdown = evaluation.marksBreakdown ? (() => { try { return JSON.parse(evaluation.marksBreakdown!); } catch { return null; } })() : null;
  const strengths = evaluation.strengths ? (() => { try { return JSON.parse(evaluation.strengths!); } catch { return []; } })() : [];
  const weaknesses = evaluation.weaknesses ? (() => { try { return JSON.parse(evaluation.weaknesses!); } catch { return []; } })() : [];
  const recommendations = evaluation.recommendations ? (() => { try { return JSON.parse(evaluation.recommendations!); } catch { return []; } })() : [];

  // Build system prompt from evaluation context
  const systemPrompt = buildTutorSystemPrompt({
    subject: evaluation.subject,
    grade: evaluation.grade,
    examType: evaluation.examType,
    totalMarks: evaluation.totalMarks,
    obtainedMarks: evaluation.obtainedMarks,
    percentage: evaluation.percentage,
    ocrText: evaluation.ocrText,
    aiFeedback: evaluation.aiFeedback,
    marksBreakdown,
    strengths,
    weaknesses,
    recommendations,
  });

  // Get or create conversation
  let conversation = await prisma.tutorConversation.findUnique({
    where: { evaluationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
        // Only last 20 messages for context window efficiency
        take: -20,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.tutorConversation.create({
      data: {
        userId,
        evaluationId,
        title: `${evaluation.subject} Tutor Session`,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  // Save user message to DB before streaming
  const savedUserMsg = await prisma.tutorMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: userMessage,
    },
  });

  // Build conversation history for Gemini
  const history = buildConversationHistory(conversation.messages);

  // Create SSE stream
  const encoder = new TextEncoder();
  let assistantContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: systemPrompt,
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(userMessage);

        // Send user message ID so client can track it
        send({ type: "user_message_id", id: savedUserMsg.id });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            assistantContent += text;
            send({ type: "delta", text });
          }
        }

        // Save assistant response
        const savedAssistantMsg = await prisma.tutorMessage.create({
          data: {
            conversationId: conversation!.id,
            role: "assistant",
            content: assistantContent,
          },
        });

        // Update conversation timestamp
        await prisma.tutorConversation.update({
          where: { id: conversation!.id },
          data: { updatedAt: new Date() },
        });

        send({ type: "done", id: savedAssistantMsg.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI response failed";
        // Check for specific errors
        const isRateLimit = msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("429");
        const isTimeout = msg.toLowerCase().includes("timeout");
        send({
          type: "error",
          message: isRateLimit
            ? "AI rate limit reached. Please wait a moment and try again."
            : isTimeout
            ? "The AI took too long to respond. Please try again."
            : "Something went wrong. Please try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
