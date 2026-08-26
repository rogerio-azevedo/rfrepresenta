import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FamilyDetail } from "@/components/catalog/family-detail";
import { getR2ObjectUrl } from "@/server/catalog/r2";
import { getPublishedCatalogFamily } from "@/server/dal/catalog";
import { ResourceNotFoundError } from "@/server/auth/errors";

async function familyResult(slug: string) {
  try { return await getPublishedCatalogFamily(slug); } catch (error) { if (error instanceof ResourceNotFoundError) notFound(); throw error; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { family } = await familyResult(slug);
  const image = family.images[0];
  return { title: `${family.name} | Catálogo RF Representa`, description: family.description.slice(0, 160), alternates: { canonical: `/catalogo/${family.slug}` }, openGraph: { images: image ? [{ url: getR2ObjectUrl(image.objectKey), alt: image.altText || family.name }] : [] } };
}

export default async function CatalogFamilyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sku?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { viewer, family } = await familyResult(slug);
  const detail = { ...family, variants: family.variants.map((variant) => ({ ...variant, imageUrl: variant.imageKey ? getR2ObjectUrl(variant.imageKey) : null })), images: family.images.map((image) => ({ ...image, imageUrl: getR2ObjectUrl(image.objectKey) })) };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.rfrepresenta.com.br";
  return <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><Link href="/catalogo" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar ao catálogo</Link><FamilyDetail family={detail} viewer={viewer} initialReference={query.sku} siteUrl={siteUrl} /></main>;
}
