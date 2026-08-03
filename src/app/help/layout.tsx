import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center — GetAhead AI",
  description: "Browse help articles about accounts, authentication, uploads, evaluation reports, and question papers on GetAhead AI.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Center — GetAhead AI",
    description: "Browse help articles about accounts, authentication, uploads, evaluation reports, and question papers on GetAhead AI.",
    url: "/help",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
