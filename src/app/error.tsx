"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-ink mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Something went wrong
        </h1>
        <p className="text-graphite text-sm mb-8">
          This page hit an unexpected error. Try again — if it keeps happening, refresh the page.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    </div>
  );
}
