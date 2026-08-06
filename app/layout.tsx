import type { Metadata, Viewport } from "next";
import { getBaseUrl } from "./site-url";
import { GITHUB_URL } from "./content";
import "./globals.css";

const title = "JPLearn — Step into Japanese";
const description = "Learn Japanese with a desktop app whose menu is a floating 3D world — spaced repetition, 17 practice modes, handwriting, and an AI tutor that runs entirely on your machine.";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=Sora:wght@400;500;600;700&display=swap";

export const viewport: Viewport = {
  themeColor: "#070b24",
};

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    applicationName: "JPLearn",
    keywords: ["learn Japanese", "Japanese desktop app", "spaced repetition", "kanji", "hiragana", "handwriting practice", "JLPT"],
    icons: { icon: "/jplearn-icon.png", shortcut: "/jplearn-icon.png" },
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", siteName: "JPLearn", locale: "en_GB", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "A twilight floating island with a torii gate — JPLearn, step into Japanese" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const baseUrl = await getBaseUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JPLearn",
    description,
    url: baseUrl,
    image: `${baseUrl}/og.jpg`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Windows",
    publisher: { "@type": "Organization", name: "JPLearn", url: GITHUB_URL },
  };

  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}
