import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your GetAhead AI account to view evaluations, analytics, and saved reports.",
  alternates: { canonical: "/login" },
};

// An already-signed-in visitor landing on /login (a stale bookmark, a link
// clicked from an old email) was shown the login form instead of being sent
// where a signed-in user actually wants to go — same fix as every
// authenticated-section layout's redirect, just inverted.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");
  return children;
}
