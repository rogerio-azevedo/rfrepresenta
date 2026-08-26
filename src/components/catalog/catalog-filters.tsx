"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CatalogQuery } from "@/schemas/products";

type Facet = { key: string; value: string; label: string; count: number };
type Collection = { slug: string; name: string; familyCount: number };
type Category = { slug: string; name: string; path: string; count: number };

const GROUPS = [
  ["color", "Cor"],
  ["size", "Tamanho"],
  ["fabric", "Tecido"],
  ["composition", "Composição"],
  ["filling", "Enchimento"],
  ["sleep_position", "Posição de dormir"],
  ["support", "Suporte"],
  ["piece_count", "Quantidade de peças"],
] as const;

const PARAM_BY_KEY: Record<string, keyof CatalogQuery> = {
  color: "color",
  size: "size",
  fabric: "fabric",
  composition: "composition",
  filling: "filling",
  sleep_position: "sleepPosition",
  support: "support",
  piece_count: "pieceCount",
};

function FilterFields({
  query,
  collections,
  categories,
  facets,
  onApply,
  idPrefix,
}: {
  query: CatalogQuery;
  collections: Collection[];
  categories: Category[];
  facets: Facet[];
  onApply?: () => void;
  idPrefix: string;
}) {
  return (
    <form method="get" action="/catalogo" className="flex flex-col gap-5" onSubmit={onApply}>
      {query.q && <input type="hidden" name="q" value={query.q} />}

      {/* Coleção */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <label htmlFor={`${idPrefix}-collection`} className="text-sm font-semibold text-foreground">
          Coleção
        </label>
        <select
          id={`${idPrefix}-collection`}
          name="collection"
          defaultValue={query.collection}
          className="h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate"
        >
          <option value="">Todas</option>
          {collections.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name} ({item.familyCount})
            </option>
          ))}
        </select>
      </div>

      {/* Categoria */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-1.5 min-w-0">
          <label htmlFor={`${idPrefix}-category`} className="text-sm font-semibold text-foreground">
            Categoria
          </label>
          <select
            id={`${idPrefix}-category`}
            name="category"
            defaultValue={query.category}
            className="h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate"
          >
            <option value="">Todas</option>
            {categories.slice(0, 40).map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.path} ({item.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Facetas dinâmicas */}
      {GROUPS.map(([key, label]) => {
        const items = facets.filter((facet) => facet.key === key).slice(0, 16);
        if (!items.length) return null;
        const param = PARAM_BY_KEY[key];
        const selected = (query[param] as string[]) || [];

        return (
          <fieldset className="border-t border-border pt-4 min-w-0" key={key}>
            <legend className="mb-2.5 text-sm font-semibold text-foreground">{label}</legend>
            <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto overscroll-contain pr-1">
              {items.map((item) => (
                <label
                  className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer select-none transition-colors"
                  key={item.value}
                >
                  <input
                    type="checkbox"
                    name={param}
                    value={item.value}
                    defaultChecked={selected.includes(item.value)}
                    className="size-4 shrink-0 rounded border-neutral-300 text-[#b83342] focus:ring-[#b83342] focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">({item.count})</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      {/* Botões de Ação */}
      <div className="sticky bottom-0 -mx-1 -mb-1 mt-2 flex items-center gap-2 border-t border-border bg-white/95 px-1 py-3 backdrop-blur-xs">
        <Link
          href="/catalogo"
          className={buttonVariants({ variant: "outline", className: "flex-1 text-xs sm:text-sm" })}
        >
          <RotateCcw className="size-3.5" /> Limpar
        </Link>
        <Button type="submit" className="flex-1 bg-[#b83342] hover:bg-[#9f2230] text-xs sm:text-sm">
          <Filter className="size-3.5" /> Aplicar
        </Button>
      </div>
    </form>
  );
}

export function CatalogFilters(props: {
  query: CatalogQuery;
  collections: Collection[];
  categories: Category[];
  facets: Facet[];
  variant: "mobile" | "desktop";
}) {
  const [open, setOpen] = useState(false);
  const active =
    Object.values(PARAM_BY_KEY).reduce(
      (total, key) =>
        total + (Array.isArray(props.query[key]) ? (props.query[key] as string[]).length : 0),
      0,
    ) +
    Number(Boolean(props.query.collection)) +
    Number(Boolean(props.query.category));

  if (props.variant === "mobile") {
    return (
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
          <SheetTrigger className={buttonVariants({ variant: "outline", className: "h-11" })}>
            <SlidersHorizontal className="size-4" /> Filtros
            {active ? ` (${active})` : ""}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-5 pb-4"
          >
            <SheetHeader className="pb-2">
              <SheetTitle>Filtrar catálogo</SheetTitle>
            </SheetHeader>
            <div className="mt-2">
              <FilterFields {...props} idPrefix="mobile-filter" onApply={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className="hidden lg:block w-full min-w-0 rounded-xl border border-border bg-white p-5 shadow-xs sticky top-24 max-h-[calc(100vh-7.5rem)] overflow-y-auto overscroll-contain">
      <div className="mb-4 pb-3 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Filtros</h2>
      </div>
      <FilterFields {...props} idPrefix="desktop-filter" />
    </aside>
  );
}
