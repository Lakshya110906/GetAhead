"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const RULE_HEIGHT = 32;

const markVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -14 },
  visible: { opacity: 1, scale: 1, rotate: -7, transition: { duration: 0.3, delay: 0.2, ease: "easeOut" } },
};

const underlineVariants: Variants = {
  hidden: { pathLength: 0 },
  visible: { pathLength: 1, transition: { duration: 0.4, delay: 0.6, ease: "easeInOut" } },
};

const noteVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, delay: 1.0, ease: "easeOut" } },
};

export function MarkedAnswerSheet() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";

  return (
    <div className="relative mx-auto max-w-md select-none" aria-hidden="true">
      <div
        className="relative bg-white rounded-sm shadow-2xl border border-rule"
        style={{ transform: "rotate(-1.2deg)" }}
      >
        {/* Sheet header strip */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-rule">
          <span className="font-mono text-[10px] tracking-widest uppercase text-graphite">
            Class 12 &middot; Mathematics
          </span>
          <span className="font-mono text-[10px] tracking-widest uppercase text-graphite">
            Paper 2 &middot; Q4
          </span>
        </div>

        <div
          className="relative pl-16 pr-6 pt-5 pb-9"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${RULE_HEIGHT - 1}px, var(--rule) ${RULE_HEIGHT}px)`,
            backgroundPosition: "0 8px",
          }}
        >
          {/* Margin rule, like a ruled exercise book */}
          <div className="absolute top-0 bottom-0 left-10 w-px bg-examiner/25" />

          <p
            className="font-body font-semibold text-ink text-[15px] mb-4"
            style={{ lineHeight: `${RULE_HEIGHT}px` }}
          >
            Differentiate y&nbsp;=&nbsp;x&sup3;&nbsp;&minus;&nbsp;5x&sup2;&nbsp;+&nbsp;4x and find
            the gradient at x&nbsp;=&nbsp;2.{" "}
            <span className="text-graphite font-mono text-sm">[5]</span>
          </p>

          <div className="font-body italic text-ink/90 text-base" style={{ lineHeight: `${RULE_HEIGHT}px` }}>
            <p>dy/dx = 3x&sup2; &minus; 10x + 4</p>
            <p>At x = 2: 3(2)&sup2; &minus; 10(2) + 4</p>

            <div className="flex items-baseline gap-3">
              <p className="relative inline-block">
                = 12 &minus; 20 + 4 = 4
                <svg
                  className="absolute left-0 -bottom-1.5 w-full h-2.5"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M1,6 C 14,2 24,9 36,5 S 58,2 70,6 S 90,9 99,4"
                    fill="none"
                    stroke="var(--examiner)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength={1}
                    variants={underlineVariants}
                    initial={initial}
                    animate="visible"
                  />
                </svg>
              </p>

              <motion.span
                className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-examiner text-examiner font-mono text-xs font-semibold flex-shrink-0"
                variants={markVariants}
                initial={initial}
                animate="visible"
              >
                3/5
              </motion.span>
            </div>
          </div>

          <motion.p
            className="mt-2 flex items-center gap-1.5 text-examiner text-sm not-italic"
            style={{ fontFamily: "var(--font-body)" }}
            variants={noteVariants}
            initial={initial}
            animate="visible"
          >
            <svg width="13" height="10" viewBox="0 0 15 11" aria-hidden="true" className="flex-shrink-0">
              <path
                d="M1 5.5h12M9 1.5l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            sign slip &mdash; 12 &minus; 20 = &minus;8
          </motion.p>
        </div>
      </div>
    </div>
  );
}
