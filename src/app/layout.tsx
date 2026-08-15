import type { Metadata, Viewport } from "next";
import { Archivo, Newsreader, IBM_Plex_Mono, Kalam, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SITE_URL } from "@/lib/siteConfig";

// Design system: five faces, each with one job.
//   Archivo      — body and UI text. Quiet by design.
//   Newsreader   — display/headings/question text. Set with real intent.
//   IBM Plex Mono — every number, without exception.
//   Kalam        — student handwriting. Only for student-written content.
//   Caveat       — examiner's pen. Only for marking and annotation.
// Previously Inter/Fraunces were loaded under these same CSS variable names
// (--body-font/--display-font) — Inter specifically is the default body
// font of the generic AI-product look this product is deliberately not
// converging on. Kalam/Caveat did not exist in the codebase at all.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--body-font",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--display-font",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--mono-font",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--handwriting-font",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--pen-font",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GetAhead | AI-powered exam answer evaluation",
    template: "%s | GetAhead",
  },
  description:
    "Upload your answer sheets and get AI-powered evaluation in under a minute, with detailed marks breakdown, subject-wise analytics, and performance insights.",
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
  alternates: { canonical: "/" },
  openGraph: {
    title: "GetAhead | AI-powered exam answer evaluation",
    description: "AI-powered evaluation in under a minute, with detailed performance analytics.",
    url: "/",
    type: "website",
    locale: "en_IN",
    siteName: "GetAhead",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetAhead — upload an answer sheet and see exactly where every mark was won or lost.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetAhead | AI-powered exam answer evaluation",
    description: "AI-powered evaluation in under a minute, with detailed performance analytics.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable} ${plexMono.variable} ${kalam.variable} ${caveat.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Blocking, runs before first paint — applies the saved (or
            system-preferred, on a first visit) theme synchronously so there's
            no flash of the light theme before React hydrates and the
            ThemeProvider effect would otherwise apply it a frame later. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("site-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"default";}if(t==="dark")document.documentElement.classList.add("theme-dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
