import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset password",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: true },
};

// Same as /login. Note: layout.tsx doesn't receive `searchParams` in the App
// Router, so this can't special-case "has a real reset token" — a signed-in
// user who genuinely wants to redeem an emailed reset link while still
// logged in should use Settings → Security → Change Password instead, or
// sign out first. That's an intentional, minor trade-off for consistency
// with the other three auth pages, not an oversight.
export default async function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");
  return children;
}
