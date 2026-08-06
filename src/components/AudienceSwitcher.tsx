"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const AUDIENCES = [
  {
    id: "students",
    tab: "Students",
    claim: "Find out where you're losing marks while there's still time to fix it.",
    points: [
      "Feedback on every question, not just one number at the top of the page",
      "The exact topics to revise after each practice sheet",
      "Score trends by subject, so you can tell if revision is actually working",
    ],
    href: "/students",
    linkLabel: "See more for students",
  },
  {
    id: "teachers",
    tab: "Teachers",
    claim: "Mark a full class set in the time it used to take to mark one script.",
    points: [
      "Evaluated against your own rubric and mark scheme, not a generic one",
      "Every mark is editable — nothing reaches a student until you release it",
      "Generate fresh practice papers at the difficulty you set",
    ],
    href: "/teachers",
    linkLabel: "See more for teachers",
  },
  {
    id: "institutions",
    tab: "Institutions",
    claim: "One marking standard applied consistently across every section and subject.",
    points: [
      "Role-based access, so departments see only their own data",
      "An audit trail on every evaluation, with the rubric version it used",
      "Exportable performance data for accreditation and internal reporting",
    ],
    href: "/institutions",
    linkLabel: "See more for institutions",
  },
  {
    id: "coaching",
    tab: "Coaching centers",
    claim: "Mock test results back the same day you run the test, for the whole batch.",
    points: [
      "Upload an entire sitting at once instead of sheet by sheet",
      "Batch-level analytics showing what the cohort got wrong, question by question",
      "The same marking standard no matter which faculty member is on duty",
    ],
    href: "/coaching-centers",
    linkLabel: "See more for coaching centers",
  },
];

export function AudienceSwitcher() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduceMotion = useReducedMotion();
  const audience = AUDIENCES[active];

  const focusTab = (index: number) => {
    setActive(index);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusTab((active + 1) % AUDIENCES.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusTab((active - 1 + AUDIENCES.length) % AUDIENCES.length);
    }
  };

  const panelTransition = reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" as const };
  const indicatorTransition = reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" as const };

  return (
    <section className="py-16 border-b border-rule">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Matches the accent-colored, semibold kicker style used by every
            other homepage section ("What it looks like", "Accuracy",
            "Process", "FAQ") — this one previously used a neutral grey
            instead, which read as a different (and, in dark mode, lower-
            contrast) component. Centered alignment is unchanged: every
            homepage kicker is centered, so that part isn't a divergence. */}
        <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-6 text-center">
          One product, four ways to use it
        </p>

        <div
          role="tablist"
          aria-label="Choose your audience"
          onKeyDown={onKeyDown}
          className="grid grid-cols-2 sm:grid-cols-4 border-b border-rule"
        >
          {AUDIENCES.map((a, i) => (
            <button
              key={a.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`audience-tab-${a.id}`}
              aria-selected={i === active}
              aria-controls={`audience-panel-${a.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={`relative py-4 px-2 text-sm sm:text-base font-medium text-center transition-colors rounded-sm ${
                i === active ? "text-ink" : "text-graphite hover:text-ink"
              }`}
            >
              {a.tab}
              {i === active && (
                <motion.span
                  layoutId="audience-indicator"
                  transition={indicatorTransition}
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-ink"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={audience.id}
            id={`audience-panel-${audience.id}`}
            role="tabpanel"
            aria-labelledby={`audience-tab-${audience.id}`}
            tabIndex={0}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={panelTransition}
            className="pt-10 grid md:grid-cols-2 gap-8 md:gap-12 items-start"
          >
            <h2
              className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {audience.claim}
            </h2>

            <div>
              <ul className="space-y-4 mb-6">
                {audience.points.map((p) => (
                  <li key={p} className="flex gap-3 text-graphite leading-relaxed">
                    <span className="mt-2.5 w-3 h-px bg-rule flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={audience.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink border-b border-rule hover:border-ink transition-colors pb-0.5"
              >
                {audience.linkLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
