import Image from "next/image";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { CatalogFamilyCard, CatalogViewer } from "@/server/dal/catalog";

export function CatalogCard({ family, viewer, imageUrl }: { family: CatalogFamilyCard; viewer: CatalogViewer; imageUrl: string | null }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-md border bg-white">
      <Link href={`/catalogo/${family.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f3f0]">
          {imageUrl ? <Image src={imageUrl} alt={family.imageAlt} fill sizes="(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1100px) 33vw, 25vw" className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.025]" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem imagem</div>}
        </div>
        <div className="flex min-h-44 flex-col p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase text-[#b83342]">{family.brand}</p>
          <h2 className="mt-2 line-clamp-3 text-sm font-semibold leading-5 sm:text-base">{family.name}</h2>
          <p className="mt-2 text-xs text-muted-foreground">{family.variantCount} {family.variantCount === 1 ? "variação" : "variações"}{family.colors.length ? ` • ${family.colors.length} cores` : ""}</p>
          <div className="mt-auto pt-4">
            {viewer.kind === "client" ? (
              <p className="font-semibold">{family.priceFrom === null || family.priceFrom === undefined ? "Preço sob consulta" : `A partir de ${formatCurrency(family.priceFrom)}`}</p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><LockKeyhole className="size-3.5" /> Entre para ver preços</p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
