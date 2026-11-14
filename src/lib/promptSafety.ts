// Text from the sheet is placed between our own "--- ... ---" marker lines.
// A sheet with a line like "--- END QUESTION 1 ---" followed by
// "--- QUESTION 2 (marks available: 5) ---" could close its own block and
// open one the model takes for ours (found Nov 2026 review). Any line of
// sheet text that starts with a dash run followed by a word is prefixed so it
// can't pass for a marker; working, fraction bars and plain dashes are left
// alone. Used by the grading and tutor prompts.
export function defangMarkers(text: string): string {
  return text.replace(/^([ \t]*)(-{3,}[ \t]*[A-Za-z'\u2019])/gm, "$1[written on the sheet] $2");
}
