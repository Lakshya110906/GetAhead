import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionPaper } from "@/lib/question-agents";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      grade,
      topic,
      difficulty,
      totalMarks,
      questionTypes,
      institutionName,
      courseCode,
      timeAllowed,
      instructions,
    } = body;

    if (!subject || !grade || !topic || !difficulty || !totalMarks || !questionTypes || !Array.isArray(questionTypes)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedTotalMarks = parseInt(totalMarks);
    if (isNaN(parsedTotalMarks)) {
      return NextResponse.json({ error: "Invalid total marks" }, { status: 400 });
    }

    // Run the multi-agent generator
    const result = await generateQuestionPaper({
      subject,
      grade,
      topic,
      difficulty,
      totalMarks: parsedTotalMarks,
      questionTypes
    });

    // Save to database
    const userId = (session.user as { id: string }).id;
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
        subject,
        grade,
        difficulty,
        totalMarks: parsedTotalMarks,
        title: result.paper.title,
        content: JSON.stringify(dbPayload)
      }
    });



    return NextResponse.json({
      success: true,
      paper: savedPaper
    });
  } catch (error) {
    console.error("API generate questions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
