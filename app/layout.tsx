import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "JPLearn — A Better Way to Learn Japanese";
const description = "Learn Japanese through structured study, spaced repetition, minigames, handwriting practice, progress tracking, and an optional local AI tutor.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title,
    description,
    applicationName: "JPLearn",
    keywords: ["learn Japanese", "Japanese desktop app", "spaced repetition", "kanji", "hiragana", "handwriting practice"],
    icons: { icon: "/jplearn-icon.png", shortcut: "/jplearn-icon.png" },
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", siteName: "JPLearn", locale: "en_GB", images: [{ url: "/og.png", width: 1728, height: 910, alt: "JPLearn desktop Japanese learning app" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
