import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SITE_URL } from "@/lib/siteConfig";

const inter = Inter({
  subsets: ["latin"],
  variable: "--body-font",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--display-font",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--mono-font",
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
    description: "Instant AI-powered evaluation with detailed performance analytics.",
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
    description: "Instant AI-powered evaluation with detailed performance analytics.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${plexMono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
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
