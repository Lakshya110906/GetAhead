"use client";

import { useEffect, useState } from "react";

// Same standard as the homepage's accuracy figure: a real, measured number
// or nothing at all — never a flat, unmeasured "within 24 hours" promise.
// /api/public/stats only returns avgSupportResponseHours once at least 10
// tickets have a real admin reply timestamp to average; until then this
// renders the qualitative fallback, not a guess dressed up as a number.
export function SupportResponseNote({ className }: { className?: string }) {
  const [hours, setHours] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHours(d?.avgSupportResponseHours ?? null))
      .catch(() => setHours(null));
  }, []);

  if (hours) {
    const rounded = Math.max(1, Math.ceil(hours));
    return (
      <p className={className}>
        We read every message — based on recent tickets, our average first response is about {rounded} hour{rounded === 1 ? "" : "s"}.
      </p>
    );
  }

  return <p className={className}>We read every message and reply as quickly as we can — there isn&apos;t yet enough ticket history to publish a reliable average response time.</p>;
}
