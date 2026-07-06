import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAnswerSheet } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { evaluationId } = await request.json();

    if (!evaluationId) {
      return NextResponse.json({ error: "Evaluation ID is required" }, { status: 400 });
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Update status to evaluating
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { status: "EVALUATING" },
    });

    // Get the OCR text or use a sample for demo
    const ocrText =
      evaluation.ocrText ||
      `Sample answer sheet for ${evaluation.subject}. 
      Question 1: Explain the concept of derivatives. 
      Answer: A derivative measures the rate of change of a function with respect to a variable.
      Question 2: Solve x^2 + 5x + 6 = 0
      Answer: (x+2)(x+3) = 0, so x = -2 or x = -3
      Question 3: What is the integral of sin(x)?
      Answer: -cos(x) + C`;

    // Run AI evaluation
    const result = await evaluateAnswerSheet(
      evaluation.subject,
      evaluation.grade || "12th",
      evaluation.examType,
      ocrText
    );

    // Save results
    const updated = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: "COMPLETED",
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        aiResponse: JSON.stringify(result),
        marksBreakdown: JSON.stringify(result.subjectBreakdown),
        aiFeedback: result.overallFeedback,
        strengths: JSON.stringify(result.strengths),
        weaknesses: JSON.stringify(result.weaknesses),
        recommendations: JSON.stringify(result.recommendations),
      },
    });

    // Increment used credits
    await prisma.subscription.updateMany({
      where: { userId: (session.user as { id: string }).id },
      data: { usedCredits: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      evaluation: updated,
      result,
    });
  } catch (error) {
    console.error("Process evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to process evaluation" },
      { status: 500 }
    );
  }
}
