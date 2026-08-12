// Single normalization point for user-supplied text that later gets
// compared, matched, stored as a grouping key, or looked up — subject,
// grade, topic, and similar short identity-like fields. The topic-
// validation incident (a trailing space on "trigonometry ") was ultimately
// an untrimmed string reaching a comparison; that class of bug recurs
// anywhere a value like this is accepted without normalization at entry.
// Trims and collapses internal whitespace only — deliberately NOT
// lowercased, since these values are also displayed back to the user
// verbatim ("Mathematics", not "mathematics"), and changing casing they
// typed would be a surprising, unrequested rewrite of their input.
export function normalizeEntryText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
