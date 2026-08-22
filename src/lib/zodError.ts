import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * The one place every route turns a failed safeParse() into a 400 response.
 * Zod's own issue.message alone ("Invalid input: expected string, received
 * undefined") names no field — a real bug this shipped with, found by
 * hitting the enqueue route with a plausible-but-incomplete payload and
 * getting an error that said nothing useful back. Prefixing the field path
 * turns it into "fileName: Required". This was duplicated identically
 * across 7 routes before being pulled out here.
 */
export function zodErrorResponse(error: ZodError, status = 400): NextResponse {
  const issue = error.issues[0];
  const field = issue.path.join(".") || "request";
  return NextResponse.json({ error: `${field}: ${issue.message}` }, { status });
}
