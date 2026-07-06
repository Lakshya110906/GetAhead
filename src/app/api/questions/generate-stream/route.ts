import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionPaperStreamed } from "@/lib/question-agents";

export const maxDuration = 120; // 2 minutes for long AI calls

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();
  const {
    subject, grade, topic, difficulty, totalMarks, questionTypes,
    institutionName, courseCode, timeAllowed, instructions,
    customPrompt, studyMaterialText,
  } = body;

  if (!subject || !grade || !topic || !difficulty || !totalMarks || !questionTypes || !Array.isArray(questionTypes)) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const parsedTotalMarks = parseInt(totalMarks);
  if (isNaN(parsedTotalMarks)) {
    return new Response(JSON.stringify({ error: "Invalid total marks" }), { status: 400 });
  }

  const userId = (session.user as { id: string }).id;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        const payload = `data: ${JSON.stringify({ event, ...( typeof data === 'object' && data !== null ? data : { data }) })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        const result = await generateQuestionPaperStreamed(
          { 
            subject, 
            grade, 
            topic, 
            difficulty, 
            totalMarks: parsedTotalMarks, 
            questionTypes,
            customPrompt: customPrompt || "",
            studyMaterialText: studyMaterialText || "",
          },
          emit
        );

        // Save to database
        const dbPayload = {
          ...result,
          metadata: {
            institutionName: institutionName || "University Examination Board",
            courseCode: courseCode || "",
            timeAllowed: timeAllowed || "2 Hours",
            instructions: instructions || ""
          }
        };

        const savedPaper = await prisma.questionPaper.create({
          data: {
            userId,
            subject, grade, difficulty,
            totalMarks: parsedTotalMarks,
            title: result.paper.title,
            content: JSON.stringify(dbPayload)
          }
        });

        try {
          await prisma.subscription.updateMany({
            where: { userId },
            data: { usedCredits: { increment: 1 } }
          });
        } catch {
          // Non-critical
        }

        emit("complete", { paper: savedPaper });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        emit("error", { message: msg });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}
