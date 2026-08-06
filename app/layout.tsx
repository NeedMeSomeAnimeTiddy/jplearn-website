import type { Metadata } from "next";
import { getBaseUrl } from "./site-url";
import "./globals.css";

const title = "JPLearn — A Better Way to Learn Japanese";
const description = "Learn Japanese through structured study, spaced repetition, minigames, handwriting practice, progress tracking, and an optional local AI tutor.";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    applicationName: "JPLearn",
    keywords: ["learn Japanese", "Japanese desktop app", "spaced repetition", "kanji", "hiragana", "handwriting practice"],
    icons: { icon: "/jplearn-icon.png", shortcut: "/jplearn-icon.png" },
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", siteName: "JPLearn", locale: "en_GB", images: [{ url: "/og.jpg", width: 1728, height: 910, alt: "JPLearn desktop Japanese learning app" }] },
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
    publisher: { "@type": "Organization", name: "JPLearn", url: "https://github.com/NeedMeSomeAnimeTiddy/JPLearn" },
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}
