import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — GetAhead AI",
  description: "Sign in to your GetAhead AI account to view evaluations, analytics, and saved reports.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
