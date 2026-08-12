"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {/* reducedMotion="user" makes every motion.* component in the tree
            (16 usages across HomeClient and the four auth pages, at last
            count) automatically honor the OS-level prefers-reduced-motion
            setting — variants still run, but instantly, with transforms/
            opacity resolved to their end state rather than animated.
            Set once here instead of wiring useReducedMotion() into every
            individual call site, so it can't be missed on a new one. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
