import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="max-w-sm text-center">
        <div
          className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-examiner text-examiner flex items-center justify-center font-mono text-2xl font-bold"
          aria-hidden="true"
        >
          404
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2" style={{ fontFamily: "var(--font-display)" }}>
          This page doesn&apos;t exist
        </h1>
        <p className="text-graphite text-sm mb-8">
          The page you&apos;re looking for was moved, renamed, or never existed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
