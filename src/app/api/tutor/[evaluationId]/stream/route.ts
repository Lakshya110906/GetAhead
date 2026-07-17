/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTutorSystemPrompt, buildConversationHistory } from "@/lib/tutor-context";
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
          // Stream a contextual, encouraging placeholder response for demo/development environments
          send({ type: "user_message_id", id: savedUserMsg.id });

          const mockReplies: Record<string, string> = {
            "why did i lose marks?": `Based on your evaluation for **${evaluation.subject}**, you scored **${evaluation.obtainedMarks}/${evaluation.totalMarks}** (${evaluation.percentage?.toFixed(1)}%).

Here is a summary of where marks were deducted:
${marksBreakdown?.filter((b: any) => b.percentage < 90).map((b: any) => `* **${b.topic}**: Scored ${b.obtainedMarks}/${b.totalMarks} — *${b.feedback}*`).join("\n") || "* Calculation details and procedural accuracy."}

For improvement:
${recommendations.map((r: string) => `* ${r}`).join("\n") || "* Focus on formulas and step-by-step proofs."}

Let me know which question you'd like to work through together!`,
            "explain like i'm 10": `Imagine your **${evaluation.subject}** paper is like a video game level. You scored **${evaluation.obtainedMarks}** points out of **${evaluation.totalMarks}**! 

* You did super well on: ${strengths.slice(0, 2).join(", ") || "the early questions"}.
* You got a bit stuck on: ${weaknesses.slice(0, 1).join(", ") || "some calculation puzzles"}.

Don't worry! Let's practice one of the tricky levels again together. Ask me a question and I'll explain it using simple examples!`,
            default: `Hello! I am your GetAhead AI Tutor. I have reviewed your **${evaluation.subject}** answer sheet, where you scored **${evaluation.obtainedMarks}/${evaluation.totalMarks}** (${evaluation.percentage?.toFixed(1)}%).

Here are some insights from your report:
* **Key Strength**: ${strengths[0] || "Methodical working"}
* **Top Improvement Area**: ${weaknesses[0] || "Review of calculus/algebra steps"}

You can ask me questions like:
1. *"Why did I lose marks?"*
2. *"Explain Question 1"*
3. *"Give me a quiz on my weak topics"*

What topic would you like to explore first?`
          };

          const userQueryClean = userMessage.toLowerCase().trim();
          let responseText = mockReplies[userQueryClean];
          if (!responseText) {
            // Check if user is asking to explain a specific question number
            const qMatch = userQueryClean.match(/explain\s+question\s+(\d+)/i);
            if (qMatch && marksBreakdown) {
              const qIndex = parseInt(qMatch[1]) - 1;
              const topicInfo = marksBreakdown[qIndex];
              if (topicInfo) {
                responseText = `Question ${qMatch[1]} covers **${topicInfo.topic}**. 
                
You scored **${topicInfo.obtainedMarks}/${topicInfo.totalMarks}** (${topicInfo.percentage.toFixed(0)}%) on this topic.
* **Evaluator Feedback**: *${topicInfo.feedback}*

Let's break down the concepts behind ${topicInfo.topic}. Would you like me to walk you through a step-by-step example or create a quick flashcard for it?`;
              }
            }
          }
          if (!responseText) {
            responseText = mockReplies.default;
          }

          const words = responseText.split(" ");
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i === words.length - 1 ? "" : " ");
            assistantContent += word;
            send({ type: "delta", text: word });
            await new Promise(r => setTimeout(r, 30)); // simulated streaming speed
          }

          const savedAssistantMsg = await prisma.tutorMessage.create({
            data: {
              conversationId: conversation!.id,
              role: "assistant",
              content: assistantContent,
            },
          });

          await prisma.tutorConversation.update({
            where: { id: conversation!.id },
            data: { updatedAt: new Date() },
          });

          send({ type: "done", id: savedAssistantMsg.id });
          return;
        }

        // Real Gemini stream setup
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
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
        console.error("Gemini stream error:", err);
        const msg = err instanceof Error ? err.message : "AI response failed";
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
