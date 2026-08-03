import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — GetAhead AI",
  description: "Get in touch with the GetAhead AI team for support, feedback, or bug reports.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — GetAhead AI",
    description: "Get in touch with the GetAhead AI team for support, feedback, or bug reports.",
    url: "/contact",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
