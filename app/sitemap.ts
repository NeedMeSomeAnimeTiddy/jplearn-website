import type { MetadataRoute } from "next";
import { getBaseUrl } from "./site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getBaseUrl();

  return [{ url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
