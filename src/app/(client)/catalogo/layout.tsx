import type { ReactNode } from "react";
import Link from "next/link";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { getCatalogViewer } from "@/server/dal/catalog";

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  const viewer = await getCatalogViewer();
  return (
    <div className="min-h-screen bg-[#f6f7f4] text-foreground">
      <CatalogHeader viewer={viewer} />
      {children}
      <footer className="mt-16 border-t bg-[#193025] text-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-8 text-sm text-white/70 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><span>RF Representa • Catálogo Altenburg para lojistas</span><Link href="/" className="font-medium text-white">Voltar ao site</Link></div></footer>
    </div>
  );
}
