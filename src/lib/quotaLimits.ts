// Plain constants with no server imports, so client components (FAQ,
// signup panel, pricing copy) can display the SAME numbers quota.ts
// enforces. Before this file existed, the FAQ and signup page both said
// "10 evaluations/day" while the server enforced 5 — a misleading statement
// about the service under the Consumer Protection Act 2019, and one that
// nobody noticed because the number lived in two places.
export type QuotaKind = "EVALUATION" | "PAPER_GENERATION" | "TUTOR";

// These are NOT independent per-user allowances — they exist against a
// single shared Gemini free-tier ceiling (RPD=20 for the whole project,
// confirmed live). See quota.ts for the full reasoning.
export const DAILY_QUOTA: Record<QuotaKind, number> = {
  EVALUATION: 5,
  PAPER_GENERATION: 3,
  TUTOR: 50,
};
