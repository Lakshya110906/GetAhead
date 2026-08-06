import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description: "See how GetAhead AI takes an answer sheet from upload to a marked-up, question-by-question evaluation in seconds.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How it works — GetAhead AI",
    description: "See how GetAhead AI takes an answer sheet from upload to a marked-up, question-by-question evaluation in seconds.",
    url: "/how-it-works",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How it works — GetAhead AI",
    description: "See how GetAhead AI takes an answer sheet from upload to a marked-up, question-by-question evaluation in seconds.",
    images: ["/og-image.png"],
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
