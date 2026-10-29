import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { SITE_URL } from "./site-url";
import { GITHUB_URL } from "./content";
import "./globals.css";

const title = "JPLearn — Step into Japanese";
const description = "Learn Japanese with a desktop app whose menu is a floating 3D world — spaced repetition, 17 practice modes, handwriting, and an AI tutor that runs entirely on your machine.";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=Sora:wght@400;500;600;700&display=swap";
// A script-inserted stylesheet never blocks first paint; text shows in the
// metric-matched fallback (world.css) until the fonts swap in.
const FONTS_SCRIPT = `(function(){var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(FONTS_HREF)};document.head.appendChild(l)})()`;

export const viewport: Viewport = {
  themeColor: "#070b24",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "JPLearn",
  keywords: ["learn Japanese", "Japanese desktop app", "spaced repetition", "kanji", "hiragana", "handwriting practice", "JLPT"],
  icons: { icon: "/jplearn-icon.png", shortcut: "/jplearn-icon.png" },
  alternates: { canonical: "/" },
  openGraph: { title, description, type: "website", url: "/", siteName: "JPLearn", locale: "en_GB", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "A twilight floating island with a torii gate — JPLearn, step into Japanese" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JPLearn",
    description,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og.jpg`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Windows",
    publisher: { "@type": "Organization", name: "JPLearn", url: GITHUB_URL },
  };

  preload(FONTS_HREF, { as: "style" });

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: FONTS_SCRIPT }} />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
        </noscript>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}
