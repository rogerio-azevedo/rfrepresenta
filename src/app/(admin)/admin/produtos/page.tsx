import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTable } from "@/components/products/product-table";
import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { FilteredVisibilityControls } from "@/components/products/filtered-visibility-controls";
import { listAdminProducts, listCatalogCategories, listProductBrands } from "@/server/dal/products";
import { productListQuerySchema } from "@/schemas/products";
import { getR2ObjectUrl } from "@/server/catalog/r2";

export const metadata = { title: "Produtos | RF Representa" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] : undefined;
  const query = productListQuerySchema.parse({ q: value("q"), visibility: value("visibility"), brand: value("brand"), categoryPath: value("categoryPath"), page: value("page") });
  const [result, brands, categories] = await Promise.all([listAdminProducts(query), listProductBrands(), listCatalogCategories()]);
  const makeHref = (page: number) => {
    const next = new URLSearchParams();
    if (query.q) next.set("q", query.q);
    if (query.visibility !== "ALL") next.set("visibility", query.visibility);
    if (query.brand) next.set("brand", query.brand);
    if (query.categoryPath) next.set("categoryPath", query.categoryPath);
    if (page > 1) next.set("page", String(page));
    return `/admin/produtos${next.toString() ? `?${next}` : ""}`;
  };
  const rows = result.items.map((row) => ({ ...row, deletedAt: row.deletedAt?.toISOString() ?? null, imageUrl: row.imageKey ? getR2ObjectUrl(row.imageKey) : null }));
  return <>
    <PageHeading title="Produtos" description="Catálogo administrável e galeria própria." actions={<Link href="/admin/produtos/novo" className={buttonVariants()}><Plus /> Novo produto</Link>} />
    <CatalogAdminNav current="/admin/produtos" />
    <form className="mb-5 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_160px_190px_190px_auto]" method="get">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={query.q} placeholder="Nome, referência ou EAN" className="h-10 pl-9" /></div>
      <select name="visibility" defaultValue={query.visibility} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="ALL">Ativos</option><option value="PUBLIC">Publicados</option><option value="PRIVATE">Privados</option><option value="ARCHIVED">Arquivados</option></select>
      <select name="brand" defaultValue={query.brand} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="">Todas as marcas</option>{brands.map((item) => <option key={item.brand} value={item.brand}>{item.brand}</option>)}</select>
      <select name="categoryPath" defaultValue={query.categoryPath} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="">Todas as categorias</option>{categories.map((item) => <option key={item.path} value={item.path}>{item.path}</option>)}</select>
      <Button type="submit" className="h-10">Filtrar</Button>
    </form>
    <FilteredVisibilityControls query={query} total={result.total} />
    <ProductTable rows={rows} />
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>{result.total} produto(s)</span><div className="flex items-center gap-2">{query.page <= 1 ? <span className={buttonVariants({ variant: "outline", size: "icon", className: "pointer-events-none opacity-50" })} aria-disabled="true"><ChevronLeft /></span> : <Link href={makeHref(query.page - 1)} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Página anterior" title="Página anterior"><ChevronLeft /></Link>}<span>Página {query.page} de {result.pageCount}</span>{query.page >= result.pageCount ? <span className={buttonVariants({ variant: "outline", size: "icon", className: "pointer-events-none opacity-50" })} aria-disabled="true"><ChevronRight /></span> : <Link href={makeHref(query.page + 1)} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Próxima página" title="Próxima página"><ChevronRight /></Link>}</div></div>
  </>;
}
