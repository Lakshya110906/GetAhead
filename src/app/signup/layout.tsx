import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free GetAhead AI account to start evaluating answer sheets and generating question papers.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Create your account — GetAhead AI",
    description: "Create a free GetAhead AI account to start evaluating answer sheets and generating question papers.",
    url: "/signup",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GetAhead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create your account — GetAhead AI",
    description: "Create a free GetAhead AI account to start evaluating answer sheets and generating question papers.",
    images: ["/og-image.png"],
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
