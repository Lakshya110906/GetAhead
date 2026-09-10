import Link from "next/link";
import { LEGAL, isSet, legalField } from "@/lib/legalConfig";
import { SITE_URL } from "@/lib/siteConfig";

// The identity/contact block every legal page ends with. Reads only from
// legalConfig.ts so the four policies and the footer can never disagree
// about who operates the service or how to reach them. Unfilled fields
// render a visible "[… — to be confirmed]" marker on purpose: a public
// legal page silently omitting a required detail is worse than one that
// visibly says it is incomplete.
export function LegalEntityBlock({ heading = "Who we are and how to reach us" }: { heading?: string }) {
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const unfilled = [
    !isSet(LEGAL.legalEntityName),
    !isSet(LEGAL.registeredAddress),
    !isSet(LEGAL.grievanceOfficer.name),
    !isSet(LEGAL.grievanceOfficer.email),
    !isSet(LEGAL.privacyEmail),
  ].some(Boolean);

  return (
    <section aria-labelledby="legal-entity-heading" className="bg-gray-50 rounded-2xl border border-rule p-6 space-y-3">
      <h3 id="legal-entity-heading" className="text-lg font-semibold text-gray-900">
        {heading}
      </h3>
      <dl className="grid sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm text-ink">
        <dt className="font-semibold">Service</dt>
        <dd>{LEGAL.productName} ({host})</dd>

        <dt className="font-semibold">Operated by</dt>
        <dd>{legalField(LEGAL.legalEntityName, "Legal entity name")}</dd>

        <dt className="font-semibold">Registered address</dt>
        <dd>{legalField(LEGAL.registeredAddress, "Registered address")}</dd>

        {isSet(LEGAL.registrationNumber) && (
          <>
            <dt className="font-semibold">Registration no.</dt>
            <dd>{LEGAL.registrationNumber}</dd>
          </>
        )}

        <dt className="font-semibold">Grievance officer</dt>
        <dd>
          {legalField(LEGAL.grievanceOfficer.name, "Name")}
          {" — "}
          {isSet(LEGAL.grievanceOfficer.email) ? (
            <a href={`mailto:${LEGAL.grievanceOfficer.email}`} className="text-blue-600 hover:underline">
              {LEGAL.grievanceOfficer.email}
            </a>
          ) : (
            legalField("", "Email")
          )}
          . Complaints are {LEGAL.grievanceOfficer.responseTime}.
        </dd>

        <dt className="font-semibold">Privacy requests</dt>
        <dd>
          {isSet(LEGAL.privacyEmail) ? (
            <a href={`mailto:${LEGAL.privacyEmail}`} className="text-blue-600 hover:underline">
              {LEGAL.privacyEmail}
            </a>
          ) : (
            legalField("", "Privacy email")
          )}
          {" or the "}
          <Link href="/contact" className="text-blue-600 hover:underline">
            contact form
          </Link>
          .
        </dd>
      </dl>
      {unfilled && (
        <p className="text-xs text-graphite border-t border-rule pt-3">
          Some operator details above are still being confirmed and will be completed before any paid plan is offered.
        </p>
      )}
    </section>
  );
}
