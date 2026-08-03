import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password — GetAhead AI",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
