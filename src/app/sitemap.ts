import type { MetadataRoute } from "next";
import { listPublishedCatalogFamilySlugs } from "@/server/dal/catalog";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.rfrepresenta.com.br").replace(/\/$/, "");
  const families = await listPublishedCatalogFamilySlugs();

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    ...families.map((family) => ({
      url: `${siteUrl}/catalogo/${family.slug}`,
      lastModified: family.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
