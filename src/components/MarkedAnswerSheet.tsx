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
    <div className="relative mx-auto max-w-[280px] sm:max-w-md select-none" aria-hidden="true">
      <div
        className="relative bg-fixed-paper rounded-sm shadow-2xl dark:shadow-none dark:ring-1 dark:ring-white/15 border border-fixed-rule"
        style={{ transform: "rotate(-1.2deg)" }}
      >
        {/* Sheet header strip */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-fixed-rule">
          <span className="font-mono text-[8px] sm:text-[10px] tracking-widest uppercase text-fixed-graphite">
            Class 12 &middot; Mathematics
          </span>
          <span className="font-mono text-[8px] sm:text-[10px] tracking-widest uppercase text-fixed-graphite">
            Paper 2 &middot; Q4
          </span>
        </div>

        <div
          className="relative pl-8 pr-4 pt-4 pb-7 sm:pl-16 sm:pr-6 sm:pt-5 sm:pb-9"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${RULE_HEIGHT - 1}px, var(--fixed-rule) ${RULE_HEIGHT}px)`,
            backgroundPosition: "0 8px",
          }}
        >
          {/* Margin rule, like a ruled exercise book */}
          <div className="absolute top-0 bottom-0 left-5 sm:left-10 w-px bg-fixed-examiner/25" />

          <p
            className="font-body font-semibold text-fixed-ink text-[11px] sm:text-[15px] mb-3 sm:mb-4"
            style={{ lineHeight: `${RULE_HEIGHT}px` }}
          >
            Differentiate y&nbsp;=&nbsp;x&sup3;&nbsp;&minus;&nbsp;5x&sup2;&nbsp;+&nbsp;4x and find
            the gradient at x&nbsp;=&nbsp;2.{" "}
            <span className="text-fixed-graphite font-mono text-[10px] sm:text-sm">[5]</span>
          </p>

          <div className="font-body italic text-fixed-ink/90 text-xs sm:text-base" style={{ lineHeight: `${RULE_HEIGHT}px` }}>
            <p>dy/dx = 3x&sup2; &minus; 10x + 4</p>
            <p>At x = 2: 3(2)&sup2; &minus; 10(2) + 4</p>

            <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
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
                    stroke="var(--fixed-examiner)"
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
                className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-fixed-examiner text-fixed-examiner font-mono text-[10px] sm:text-xs font-semibold flex-shrink-0"
                variants={markVariants}
                initial={initial}
                animate="visible"
              >
                3/5
              </motion.span>
            </div>
          </div>

          <motion.p
            className="mt-2 flex items-center gap-1.5 text-fixed-examiner text-xs sm:text-sm not-italic"
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
