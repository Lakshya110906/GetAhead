import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Generates a simple, real, typed-text PDF answer sheet — a legitimate input
// shape for the extraction pipeline (EXTRACTION_PROMPT explicitly expects
// "handwritten or typed"), used only for regression/fixture testing of the
// grading pipeline's code paths. This is deliberately NOT the accuracy
// golden-set (fixtures/golden-set), which must stay real teacher-marked
// sheets — these are synthetic-by-design, standard record/replay fixtures.
export interface FixtureQuestionSpec {
  questionNumber: number;
  questionText: string;
  marksAvailable: number;
  studentAnswer: string;
}

export interface FixtureSheetSpec {
  title: string;
  subjectLine: string;
  questions: FixtureQuestionSpec[];
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

// A genuinely blank page — no title, no questions, no text at all. Used to
// verify the pipeline returns an honest error (NotAnAnswerSheetError) for a
// non-answer-sheet upload instead of fabricating a report from nothing.
export async function buildBlankPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function buildFixturePdf(spec: FixtureSheetSpec): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]);
  const marginX = 50;
  let y = 742;
  const lineHeight = 16;

  const ensureSpace = (linesNeeded: number) => {
    if (y - linesNeeded * lineHeight < 50) {
      page = doc.addPage([612, 792]);
      y = 742;
    }
  };

  page.drawText(spec.title, { x: marginX, y, size: 16, font: boldFont, color: rgb(0, 0, 0) });
  y -= lineHeight * 1.5;
  page.drawText(spec.subjectLine, { x: marginX, y, size: 11, font });
  y -= lineHeight * 1.5;

  for (const q of spec.questions) {
    ensureSpace(3);
    page.drawText(`Q${q.questionNumber}. [${q.marksAvailable} marks]`, { x: marginX, y, size: 12, font: boldFont });
    y -= lineHeight;
    for (const line of wrapText(q.questionText, 95)) {
      ensureSpace(1);
      page.drawText(line, { x: marginX, y, size: 11, font });
      y -= lineHeight;
    }
    y -= lineHeight * 0.5;
    ensureSpace(1);
    page.drawText("Answer:", { x: marginX, y, size: 11, font: boldFont });
    y -= lineHeight;
    // An empty studentAnswer means a genuinely blank answer — render
    // literal empty space, not placeholder text. A page that visibly PRINTS
    // "[left blank]" is not blank; it's a page with legible text on it that
    // happens to describe blankness, which a real vision model reads as
    // readable content, not absence. (Confirmed live: this is exactly what
    // sheet-d-edge's Q1 rendered as before this fix.)
    if (q.studentAnswer.trim().length > 0) {
      for (const line of wrapText(q.studentAnswer, 95)) {
        ensureSpace(1);
        page.drawText(line, { x: marginX, y, size: 11, font });
        y -= lineHeight;
      }
    }
    y -= lineHeight;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
