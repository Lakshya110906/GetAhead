# Legal & accessibility compliance — status and open items

_Last audit: 10 September 2026. This is a working checklist, not legal advice; have a
lawyer review the policies before launching paid plans or marketing at scale._

GetAhead AI is operated from India, serves school students (many under 18), sends
uploaded answer sheets to Google's Gemini API, and is currently free. Those four facts
drive almost everything below.

## What's in place

| Area | Status | Where |
|---|---|---|
| Privacy policy (DPDP Act 2023 + SPDI Rules 2011 notice) | ✅ | `/privacy` |
| Terms of service | ✅ | `/terms` |
| Cookie policy | ✅ | `/cookies` |
| Refund & cancellation policy | ✅ (free tier; pre-commits rules for any paid plan) | `/refund` |
| Cookie consent banner | ✅ Not required — only strictly-necessary cookies + two functional localStorage keys; no analytics, ads, or third-party embeds. Documented in `/cookies`. Re-check the moment any analytics is added. | `src/app/cookies/page.tsx` |
| Affirmative signup consent, recorded per account | ✅ Two required checkboxes (terms+privacy; 18+ or guardian consent), enforced server-side, stored as `User.consentAcceptedAt / consentVersion / ageConsentConfirmed` | `src/app/signup`, `src/app/api/auth/signup`, `prisma/schema.prisma` |
| Data minimisation | ✅ Signup collects name, email, password, role only. Support tickets keep IP/UA for abuse detection (disclosed). | — |
| Erasure actually erases | ✅ Account deletion now also deletes the uploaded files from Vercel Blob and the cached extraction/grading rows (neither was reached by the DB cascade before); closed support tickets are purged after 12 months by the retention cron. | `src/lib/blobCleanup.ts`, `src/app/api/user/delete-account`, `src/app/api/cron/purge-old-logs` |
| Analytics / tracking | ✅ None. Sentry error reports only, with request bodies/headers stripped and content keys redacted. | `instrumentation*.ts`, `src/lib/errorTracking.ts` |
| Third-party embeds | ✅ None. Fonts self-hosted via `next/font` (no runtime request to Google). | `src/app/layout.tsx` |
| Fake reviews / testimonials | ✅ None exist. "Trusted by students and teachers" removed from login. | — |
| Unsupported claims | ✅ Fixed: "10 evaluations/day" → real quota from `quotaLimits.ts`; "AI-consistent"/"more consistent than human grading" removed (measured variance contradicts it); "advanced OCR … effectively" softened; "Enterprise SLA on request" removed; non-functional "Remember me" removed. Accuracy figure on the homepage stays hidden until a real golden-set baseline exists. | various |
| Business details & grievance officer | ⚠️ Rendered everywhere from one config, but **placeholders are still empty** (see below) | `src/lib/legalConfig.ts` |
| Image copyright | ✅ Only own screenshots + own OG image remain; unused Next/Vercel boilerplate SVGs deleted. Lucide icons (ISC) and Google Fonts (OFL) are licence-clean. | `public/` |
| Accessibility | ✅ Skip link + `<main id="main-content">` on every page; all form labels associated; keyboard-reachable role picker; named password toggles; `role="alert"` on errors; descriptive screenshot alt text; contrast: text tokens ≥ 4.5:1 in both themes (gray-400/blue-500 are remapped to graphite/ink in `globals.css`), placeholders now graphite. | — |

## Open items — only you can do these

1. **Fill in `src/lib/legalConfig.ts`.** Legal entity name, registered address, jurisdiction city,
   grievance officer name + email, a monitored privacy email. Until then every legal page and the
   footer visibly say "[… — to be confirmed]". Required by IT (Intermediary Guidelines) Rules 2021
   r.3(2) (grievance officer) and, once anything is sold, Consumer Protection (E-Commerce) Rules 2020 r.4.
2. **Move Gemini to the paid tier — the single biggest exposure found.** The app is on the Gemini
   API *Unpaid Services* tier. Google's terms for that tier (verified 10 Sep 2026 at
   ai.google.dev/gemini-api/terms) say Google uses submitted content "to provide, improve, and develop
   Google products … and machine learning technologies", that "human reviewers may read, annotate, and
   process your API input and output", and — verbatim — "Do not submit sensitive, confidential, or
   personal information to the Unpaid Services." Children's handwritten answer sheets are personal
   information. This is disclosed honestly in `/privacy` §4 and on the upload page, but disclosure is not
   a cure: under DPDP the fiduciary must not process a child's data in a way "likely to cause any
   detrimental effect", and sending it to be used for training/human review is hard to defend. Paid tier
   also removes the RPD=20 ceiling that caps the whole app at ~10 evaluations/day.
3. **Set `RESEND_FROM_EMAIL` to a domain you own.** The fallback is now Resend's sandbox sender;
   `getahead.ai` is not yours (it's parked for sale — see `siteConfig.ts`).
4. **Re-consent existing accounts.** Users created before consent recording have
   `consentAcceptedAt = null`. On the next material policy change, show them the consent step at login
   rather than assuming a yes.
5. **Inactivity deletion job.** DPDP s.8(7) requires erasing personal data once its purpose is served.
   `/privacy` §8 currently says data is kept while the account is active, which is defensible but thin.
   Add a cron (under `src/app/api/cron/` + `vercel.json`) that emails accounts inactive for 24 months and
   deletes them 30 days later — and only *then* add that promise to the policy. Not promised yet on purpose.
6. **Verifiable parental consent.** The DPDP Rules 2025 describe verification via Digital Locker /
   consent-manager tokens. Today the site relies on a self-declaration checkbox and says so in §11.
   Adopt a verification mechanism when one is practical; until then keep the checkbox and the honest note.
7. **Before any paid plan:** finalise `/refund` §3 (prices incl. GST, billing cycle, exact refund window),
   confirm the 7-day full-refund promise is one you can honour, add GSTIN to `legalConfig.ts`, and get
   the terms reviewed. Also add a payment-provider sub-processor to `/privacy` §7.
8. **Data portability endpoint.** `/privacy` promises data on request in a portable format; today that's
   a manual process via the contact form. Fine for now; automate if request volume grows.
9. **Lawyer review** of `/privacy`, `/terms`, `/refund` for your specific entity type and state.

## Laws considered

- **Digital Personal Data Protection Act, 2023** and draft DPDP Rules 2025 — notice, consent, children
  (< 18), breach notification to the Data Protection Board, grievance redressal, erasure, nomination.
- **IT Act 2000 s.43A + SPDI Rules 2011** — published privacy policy, reasonable security practices,
  grievance officer.
- **IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021** — grievance officer
  details on the site, 24h acknowledgement / 15-day resolution.
- **Consumer Protection Act 2019**, **E-Commerce Rules 2020**, **CCPA Guidelines for Prevention of
  Misleading Advertisements 2022** — accurate claims (quota numbers, "consistent", "trusted by"),
  seller identity, refund terms, non-excludable consumer rights.
- **GDPR / UK GDPR** — for any EEA/UK users: rights, legal basis, international transfer disclosure
  (`/privacy` §13).
- **Rights of Persons with Disabilities Act 2016 / GIGW** — WCAG 2.1 AA is the reference standard;
  applied as good practice.
- **Gemini API Additional Terms of Service** — the Unpaid Services data-use clause above.
