import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogQuerySchema, type CatalogQuery } from "@/schemas/products";
import { getR2ObjectUrl } from "@/server/catalog/r2";
import {
  listActiveCatalogCollections,
  listCatalogCategoriesForCollection,
  listCatalogFacets,
  listCatalogFamilies,
} from "@/server/dal/catalog";

export const metadata = {
  title: "Catálogo Altenburg | RF Representa",
  description:
    "Consulte produtos, variações e fichas técnicas Altenburg disponíveis pela RF Representa.",
};

function queryFromParams(params: Record<string, string | string[] | undefined>) {
  return catalogQuerySchema.parse({
    q: params.q,
    collection: params.collection,
    category: params.category,
    color: params.color,
    size: params.size,
    fabric: params.fabric,
    composition: params.composition,
    filling: params.filling,
    sleepPosition: params.sleepPosition,
    support: params.support,
    pieceCount: params.pieceCount,
    sort: params.sort,
    page: params.page,
    pageSize: 24,
  });
}

function queryHref(query: CatalogQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.collection) params.set("collection", query.collection);
  if (query.category) params.set("category", query.category);
  for (const key of [
    "color",
    "size",
    "fabric",
    "composition",
    "filling",
    "sleepPosition",
    "support",
    "pieceCount",
  ] as const) {
    for (const value of query[key]) params.append(key, value);
  }
  if (query.sort !== "RELEVANCE") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));
  return `/catalogo${params.size ? `?${params}` : ""}`;
}

function QueryHiddenFields({
  query,
  except,
}: {
  query: CatalogQuery;
  except: string[];
}) {
  const values: Array<[string, string]> = [];
  if (query.q) values.push(["q", query.q]);
  if (query.collection) values.push(["collection", query.collection]);
  if (query.category) values.push(["category", query.category]);
  for (const key of [
    "color",
    "size",
    "fabric",
    "composition",
    "filling",
    "sleepPosition",
    "support",
    "pieceCount",
  ] as const) {
    for (const value of query[key]) values.push([key, value]);
  }
  if (query.sort !== "RELEVANCE") values.push(["sort", query.sort]);

  return values
    .filter(([key]) => !except.includes(key))
    .map(([key, value], index) => (
      <input
        type="hidden"
        name={key}
        value={value}
        key={`${key}-${value}-${index}`}
      />
    ));
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const className = buttonVariants({ variant: "outline", className: "h-11" });
  if (disabled)
    return (
      <span className={`${className} pointer-events-none opacity-50`} aria-disabled="true">
        {children}
      </span>
    );
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = queryFromParams(await searchParams);
  const [result, collections, categories, facets] = await Promise.all([
    listCatalogFamilies(query),
    listActiveCatalogCollections(),
    listCatalogCategoriesForCollection(query.collection),
    listCatalogFacets(query),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase text-[#b83342]">Catálogo RF Representa</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Encontre o mix certo para sua loja.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Explore famílias, variações e informações técnicas dos produtos Altenburg.
        </p>
      </div>

      <form
        method="get"
        action="/catalogo"
        className="sticky top-16 z-30 mt-7 flex gap-2 border-y bg-[#f6f7f4]/95 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:py-0"
      >
        <QueryHiddenFields query={query} except={["q"]} />
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 bg-white pl-9"
            name="q"
            defaultValue={query.q}
            placeholder="Nome, referência ou EAN"
          />
        </div>
        <Button type="submit" className="h-11 px-4 bg-[#b83342] hover:bg-[#9f2230]">
          Buscar
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 lg:justify-end">
        <CatalogFilters
          variant="mobile"
          query={result.query}
          collections={collections}
          categories={categories}
          facets={facets}
        />
        <form method="get" action="/catalogo" className="flex items-center gap-2">
          <QueryHiddenFields query={result.query} except={["sort"]} />
          <label htmlFor="catalog-sort" className="sr-only">
            Ordenar
          </label>
          <select
            id="catalog-sort"
            name="sort"
            defaultValue={result.query.sort}
            className="h-11 rounded-md border bg-white px-3 text-sm"
          >
            <option value="RELEVANCE">Relevância</option>
            <option value="NAME_ASC">Nome A–Z</option>
            <option value="NAME_DESC">Nome Z–A</option>
            {result.viewer.kind === "client" && (
              <>
                <option value="PRICE_ASC">Menor preço</option>
                <option value="PRICE_DESC">Maior preço</option>
              </>
            )}
          </select>
          <Button type="submit" variant="outline" className="h-11">
            Ordenar
          </Button>
        </form>
      </div>

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <CatalogFilters
          variant="desktop"
          query={result.query}
          collections={collections}
          categories={categories}
          facets={facets}
        />
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {result.total} {result.total === 1 ? "família encontrada" : "famílias encontradas"}
            </p>
            {result.query.collection && (
              <Link href="/catalogo" className="text-sm font-semibold text-[#b83342]">
                Limpar seleção
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((family) => (
              <CatalogCard
                key={family.id}
                family={family}
                viewer={result.viewer}
                imageUrl={family.imageKey ? getR2ObjectUrl(family.imageKey) : null}
              />
            ))}
          </div>
          {!result.items.length && (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border bg-white p-8 text-center shadow-xs">
              <h2 className="font-semibold">Nenhum produto encontrado</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tente remover um filtro ou buscar por outro termo.
              </p>
              <Link
                href="/catalogo"
                className={buttonVariants({ variant: "outline", className: "mt-5" })}
              >
                Limpar filtros
              </Link>
            </div>
          )}
          <nav
            className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-end"
            aria-label="Paginação"
          >
            <PaginationLink
              href={queryHref(result.query, Math.max(1, result.query.page - 1))}
              disabled={result.query.page <= 1}
            >
              <ArrowLeft /> Anterior
            </PaginationLink>
            <span className="col-span-2 row-start-1 text-center text-sm text-muted-foreground sm:col-auto sm:row-auto">
              Página {result.query.page} de {result.pageCount}
            </span>
            <PaginationLink
              href={queryHref(
                result.query,
                Math.min(result.pageCount, result.query.page + 1),
              )}
              disabled={result.query.page >= result.pageCount}
            >
              Próxima <ArrowRight />
            </PaginationLink>
          </nav>
        </section>
      </div>
    </main>
  );
}
