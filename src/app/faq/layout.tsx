import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — GetAhead AI",
  description: "Answers to common questions about accounts, uploads, evaluation accuracy, privacy, and pricing on GetAhead AI.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — GetAhead AI",
    description: "Answers to common questions about accounts, uploads, evaluation accuracy, privacy, and pricing on GetAhead AI.",
    url: "/faq",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
