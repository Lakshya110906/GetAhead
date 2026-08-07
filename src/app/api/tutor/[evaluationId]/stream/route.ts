/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTutorSystemPrompt, buildConversationHistory } from "@/lib/tutor-context";
import { consumeQuota, QuotaExceededError } from "@/lib/quota";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/errorTracking";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

type RouteParams = { params: Promise<{ evaluationId: string }> };

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

  // Rate limit (bursts) and daily quota (total spend), same as every other
  // Gemini-calling feature — the rate limit alone stops a burst, not a day
  // of steady-paced messages.
  const allowed = await checkRateLimit(userId);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), { status: 429 });
  }
  try {
    await consumeQuota(userId, "TUTOR");
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: err.message, quotaExceeded: true, limit: err.limit, resetsAt: err.resetsAt.toISOString() }),
        { status: 429 }
      );
    }
    throw err;
  }

  // Verify ownership and load full evaluation context. findFirst scoped to
  // { id, userId } together means another user's evaluationId 404s here —
  // this is the ownership boundary section 7 test 17 checks.
  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, userId },
  });
  if (!evaluation) {
    return new Response(JSON.stringify({ error: "Evaluation not found" }), { status: 404 });
  }

  // Same guard as the report routes: a real grading call always sets
  // modelId/promptVersion alongside status SUCCEEDED. The tutor must not be
  // built from — and cannot honestly discuss — a row that isn't a real,
  // complete, validated grade.
  if (evaluation.status !== "SUCCEEDED" || !evaluation.modelId || !evaluation.promptVersion) {
    return new Response(JSON.stringify({ error: "This evaluation has no completed, valid report to tutor on yet." }), { status: 409 });
  }

  // Parse stored JSON fields. questionGrades — real per-question marks,
  // grounding quotes, and error types — is what makes "what did I get wrong
  // in Q3?" answerable; the previous version only had the topic-level
  // rollup, mislabeled Q1/Q2/Q3 by array index rather than real question
  // numbers.
  const parsedAiResponse = evaluation.aiResponse ? (() => { try { return JSON.parse(evaluation.aiResponse!); } catch { return null; } })() : null;
  const questionGrades = parsedAiResponse?.questionGrades ?? null;
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
    questionGrades,
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

  // Check if API key is valid or placeholder
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const isPlaceholder = !apiKey || apiKey === "your-gemini-api-key-here" || apiKey.startsWith("your-gemini") || apiKey.length < 20;

  // Create SSE stream
  const encoder = new TextEncoder();
  let assistantContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (isPlaceholder) {
          // No fallback content, ever — a templated reply here is exactly
          // the class of bug this whole rebuild removes elsewhere: a
          // student could not tell it apart from a real, grounded answer.
          // If the API key isn't configured, that's a real error to surface,
          // not a reason to fabricate a plausible-sounding response.
          send({ type: "error", message: "The AI tutor isn't configured in this environment (no valid model API key). This is a setup problem, not something retrying will fix." });
          return;
        }

        // Real Gemini stream setup
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: systemPrompt,
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(userMessage);

        send({ type: "user_message_id", id: savedUserMsg.id });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            assistantContent += text;
            send({ type: "delta", text });
          }
        }

        // Save assistant response to DB
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
        const isRateLimit = msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("429");
        const isTimeout = msg.toLowerCase().includes("timeout");
        const code = isRateLimit ? "TUTOR_RATE_LIMITED" : isTimeout ? "TUTOR_TIMEOUT" : "TUTOR_STREAM_FAILED";

        logger.error(`[${code}] Tutor stream failed for evaluation ${evaluationId}`, {
          route: "POST /api/tutor/[evaluationId]/stream",
          code,
          evaluationId,
          userId,
          message: msg,
          stack: err instanceof Error ? err.stack : undefined,
        });
        captureException(err, { code, route: "POST /api/tutor/[evaluationId]/stream", evaluationId, userId });
        try {
          await prisma.errorLog.create({
            data: { type: code, message: `tutor stream (evaluation ${evaluationId}): ${msg}`, stack: err instanceof Error ? err.stack || null : null, path: "POST /api/tutor/[evaluationId]/stream" },
          });
        } catch {
          // best-effort — already logged above
        }

        send({
          type: "error",
          code,
          message: isRateLimit
            ? "AI rate limit reached. Please wait a moment and try again."
            : isTimeout
            ? "The AI took too long to respond. Please try again."
            : "The tutor couldn't respond that time. Send your question again.",
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
