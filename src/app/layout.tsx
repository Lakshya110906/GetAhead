import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "GetAhead | AI-Powered Exam Answer Evaluation",
    template: "%s | GetAhead",
  },
  description:
    "Upload your answer sheets and get instant AI-powered evaluation with detailed marks breakdown, subject-wise analytics, and performance insights.",
  keywords: [
    "exam evaluation",
    "AI grading",
    "answer sheet evaluation",
    "marks analysis",
    "student performance",
    "educational AI",
    "GetAhead",
  ],
  authors: [{ name: "GetAhead" }],
  openGraph: {
    title: "GetAhead | AI-Powered Exam Answer Evaluation",
    description: "Instant AI-powered evaluation with detailed performance analytics.",
    type: "website",
    locale: "en_IN",
    siteName: "GetAhead",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetAhead | AI-Powered Exam Answer Evaluation",
    description: "Instant AI-powered evaluation with detailed performance analytics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
