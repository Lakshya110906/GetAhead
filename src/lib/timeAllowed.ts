// Standalone (no server-only imports) so both the API routes/agents AND the
// client-side form can compute the same suggested value — time allowed must
// be derived from total marks, not generated independently of the paper body
// (the reported bug: "Time Allowed: 2 Hours" for a 6-mark paper).
// Rule: ~1.75 minutes per mark (midpoint of a documented 1.5–2 min/mark
// range), rounded up to the nearest 5 minutes, minimum 30.
export function computeTimeAllowed(totalMarks: number): string {
  const minutes = Math.max(30, Math.ceil((totalMarks * 1.75) / 5) * 5);
  if (minutes < 60) return `${minutes} Minutes`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} Hour${hours === 1 ? "" : "s"}`;
  const wholeHours = Math.floor(hours);
  const remMinutes = minutes - wholeHours * 60;
  return `${wholeHours} Hour${wholeHours === 1 ? "" : "s"} ${remMinutes} Minutes`;
}
