import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email — GetAhead AI",
  alternates: { canonical: "/verify-email" },
  robots: { index: false, follow: true },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
