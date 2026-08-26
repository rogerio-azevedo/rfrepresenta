"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LockKeyhole, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { CatalogFamilyDetail, CatalogViewer } from "@/server/dal/catalog";

type DetailFamily = Omit<CatalogFamilyDetail, "variants" | "images"> & {
  variants: Array<CatalogFamilyDetail["variants"][number] & { imageUrl: string | null }>;
  images: Array<CatalogFamilyDetail["images"][number] & { imageUrl: string }>;
};

function specValue(specifications: Record<string, unknown>, names: string[]) {
  const match = Object.entries(specifications).find(([key]) => names.some((name) => key.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")));
  if (!match) return "";
  return Array.isArray(match[1]) ? match[1].join(", ") : String(match[1] ?? "");
}

function variantLabel(variant: CatalogFamilyDetail["variants"][number]) {
  return [
    specValue(variant.specifications, ["Cor", "Cor principal"]),
    specValue(variant.specifications, ["Tamanho", "Tamanho - Travesseiro"]),
  ].filter(Boolean).join(" • ") || variant.reference || variant.name;
}

export function FamilyDetail({ family, viewer, initialReference, siteUrl }: { family: DetailFamily; viewer: CatalogViewer; initialReference?: string; siteUrl: string }) {
  const initial = family.variants.find((variant) => variant.reference === initialReference) ?? family.variants[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const selected = family.variants.find((variant) => variant.id === selectedId) ?? initial;
  const images = family.images.filter((image) => image.productId === selected.id);
  const shareUrl = `${siteUrl.replace(/\/$/, "")}/catalogo/${family.slug}?sku=${encodeURIComponent(selected.reference ?? "")}`;
  const whatsapp = `https://wa.me/5566999687575?text=${encodeURIComponent(`Olá! Gostaria de informações sobre ${family.name}, variação ${variantLabel(selected)}, referência ${selected.reference ?? "não informada"}. ${shareUrl}`)}`;

  return <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:gap-12">
    <div className="min-w-0"><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">{(images.length ? images : family.images.slice(0, 1)).map((image, index) => <div className="relative aspect-[4/5] min-w-full snap-center overflow-hidden rounded-md bg-[#f2f3f0]" key={`${image.objectKey}-${index}`}><Image src={image.imageUrl} alt={image.altText || family.name} fill priority={index === 0} sizes="(max-width: 1024px) 100vw, 58vw" className="object-contain p-3" /></div>)}</div>{images.length > 1 && <p className="mt-2 text-center text-xs text-muted-foreground">Deslize para ver mais imagens</p>}</div>
    <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="text-xs font-semibold uppercase text-[#b83342]">{family.brand}</p><h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{family.name}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Ref. {selected.reference ?? "não informada"}{selected.ean ? ` • EAN ${selected.ean}` : ""}</p>
      {family.variants.length > 1 && <fieldset className="mt-6"><legend className="text-sm font-semibold">Escolha a variação</legend><div className="mt-3 grid grid-cols-2 gap-2">{family.variants.map((variant) => <button type="button" key={variant.id} onClick={() => { setSelectedId(variant.id); const next = new URL(window.location.href); if (variant.reference) next.searchParams.set("sku", variant.reference); window.history.replaceState(null, "", next); }} className={`min-h-11 rounded-md border px-3 py-2 text-left text-xs ${variant.id === selected.id ? "border-[#b83342] bg-[#fff5f6] font-semibold" : "bg-white hover:bg-muted"}`}>{variantLabel(variant)}</button>)}</div></fieldset>}
      <div className="mt-6 border-y py-5">{viewer.kind === "client" ? <p className="text-2xl font-semibold">{selected.commercialPrice === null || selected.commercialPrice === undefined ? "Preço sob consulta" : formatCurrency(selected.commercialPrice)}</p> : <div><p className="flex items-center gap-2 font-semibold"><LockKeyhole className="size-4" /> Preço exclusivo para clientes</p><Link href={`/login?callbackUrl=${encodeURIComponent(`/catalogo/${family.slug}?sku=${selected.reference ?? ""}`)}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#b83342]">Entrar para consultar</Link></div>}</div>
      <p className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">{family.description}</p>
      <div className="mt-7"><h2 className="text-lg font-semibold">Ficha técnica</h2><dl className="mt-3 divide-y border-y">{Object.entries(selected.specifications).map(([key, value]) => <div className="grid grid-cols-[minmax(110px,0.42fr)_1fr] gap-3 py-3 text-sm" key={key}><dt className="font-medium">{key}</dt><dd className="text-muted-foreground">{Array.isArray(value) ? value.join(", ") : String(value ?? "")}</dd></div>)}</dl></div>
      <div className="sticky bottom-0 mt-7 bg-[#f6f7f4] py-3 lg:static"><a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b83342] px-4 font-semibold text-white hover:bg-[#9f2938]"><MessageCircle className="size-5" /> Consultar pelo WhatsApp</a></div>
    </div>
  </div>;
}
