// Single source of truth for every legally-required identity detail shown
// on the site (footer, privacy/terms/cookie/refund pages). Fill these in
// ONCE, here — nothing else in the codebase should hardcode a company name,
// address, or grievance contact.
//
// Why these fields exist (India, where the service is operated from and
// primarily used):
//   - Legal entity + registered address: Consumer Protection (E-Commerce)
//     Rules 2020 r.4(2) once anything is sold; IT (Intermediary Guidelines)
//     Rules 2021 r.3(1)(a) for the published terms/policies of any
//     intermediary.
//   - Grievance officer (name + contact, acknowledged within 24h, resolved
//     within 15 days): IT (Intermediary Guidelines) Rules 2021 r.3(2); also
//     the "grievance redressal" contact the Digital Personal Data Protection
//     Act 2023 s.6(4)/s.13 and the SPDI Rules 2011 r.5(9) require a data
//     fiduciary to publish.
//   - A monitored email address: the DPDP Rules require a working contact
//     for consent withdrawal and rights requests; a web form alone is a
//     weak answer to "how do I reach your data protection contact".
//
// Every value below that is still a placeholder is rendered with a visible
// "[to be confirmed]" marker so an unfilled field can never silently read
// as a real fact on a public page.
export const LEGAL = {
  productName: "GetAhead AI",
  // The registered legal name of the person or entity operating the service
  // (e.g. "GetAhead Learning Private Limited" or, for a sole proprietor,
  // your full legal name). This is who a court or regulator addresses.
  legalEntityName: "",
  // Full registered/principal place of business, including PIN code.
  registeredAddress: "",
  // Optional: CIN / GSTIN / Udyam number if you have one.
  registrationNumber: "",
  // Country of operation and governing law. City sets the court whose
  // jurisdiction the terms name.
  country: "India",
  jurisdictionCity: "",
  grievanceOfficer: {
    name: "",
    email: "",
    // Working days; IT Rules 2021 require acknowledgement within 24 hours
    // and resolution within 15 days of receipt.
    responseTime: "acknowledged within 24 hours, resolved within 15 days",
  },
  // A monitored inbox for privacy/legal requests (can be the same as the
  // grievance officer's).
  privacyEmail: "",
  // Bumped whenever the terms or privacy policy change materially. Stored
  // against each account at signup (User.consentVersion) so it is possible
  // to show WHICH version a person agreed to — DPDP consent must be
  // demonstrable, not just assumed.
  consentVersion: "2026-09-10",
  effectiveDate: "10 September 2026",
} as const;

/** True when a placeholder field has been filled in. */
export function isSet(value: string): boolean {
  return value.trim().length > 0;
}

/** Renders a legal field, or a visible marker if it hasn't been filled in yet. */
export function legalField(value: string, label: string): string {
  return isSet(value) ? value : `[${label} — to be confirmed]`;
}
