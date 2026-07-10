import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const uploadSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  grade: z.string().optional(),
  examType: z.enum(["MCQ", "Descriptive", "Mixed"]),
  fileName: z.string().optional(),
  fileContent: z.string().optional(), // Base64 content for OCR simulation
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;



    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { subject, grade, examType, fileName } = parsed.data;

    // Create evaluation record
    const evaluation = await prisma.evaluation.create({
      data: {
        userId,
        subject,
        grade: grade || "12th",
        examType,
        status: "PROCESSING_OCR",
        originalFileName: fileName || "uploaded-sheet",
        fileType: "PDF",
        // OCR would happen here with real implementation
        ocrText: `Sample extracted text from ${fileName || "uploaded-sheet"} for ${subject} exam.`,
      },
    });

    return NextResponse.json({
      success: true,
      evaluationId: evaluation.id,
      message: "File uploaded successfully. Processing started.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
