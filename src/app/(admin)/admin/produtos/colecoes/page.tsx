import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listAdminCollections } from "@/server/dal/catalog-admin";
import { getR2ObjectUrl } from "@/server/catalog/r2";
import { resolveDepartmentCoverKey } from "@/server/catalog/b2b-categories";

export const metadata = { title: "Coleções | Produtos" };

type AdminCollection = Awaited<ReturnType<typeof listAdminCollections>>[number] & { imageUrl: string | null };

function familyLabel(count: number) {
  return `${count} ${count === 1 ? "família" : "famílias"}`;
}

function CollectionCard({ collection }: { collection: AdminCollection }) {
  return (
    <article className="rounded-lg border bg-white p-5">
      <div className="flex items-start gap-4">
        {collection.imageUrl ? (
          <Image src={collection.imageUrl} alt="" width={72} height={72} className="size-18 shrink-0 rounded-md border object-cover" />
        ) : (
          <div className="size-18 shrink-0 rounded-md border bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{collection.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                /{collection.slug} • {collection.kind === "department" ? `${Number(collection.categoryCount)} categorias` : "linha B2B"} • {familyLabel(collection.familyCount)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              <Badge variant={collection.kind === "department" ? "default" : "outline"}>{collection.kind === "department" ? "Departamento" : "Linha"}</Badge>
              {collection.isFeatured && <Badge>Destaque</Badge>}
              <Badge variant={collection.isActive ? "secondary" : "outline"}>{collection.isActive ? "Ativa" : "Inativa"}</Badge>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
          {collection.isFeatured && collection.familyCount === 0 ? (
            <p className="mt-2 text-sm text-destructive">Nenhuma família pública vinculada — o card da landing vai mostrar 0.</p>
          ) : null}
          <Link className={buttonVariants({ variant: "outline", className: "mt-4" })} href={`/admin/produtos/colecoes/${collection.id}`}>Editar</Link>
        </div>
      </div>
    </article>
  );
}

export default async function CollectionsPage() {
  const collections = (await listAdminCollections()).map((collection) => {
    const coverKey = collection.kind === "department"
      ? resolveDepartmentCoverKey(collection.slug, collection.imageKey)
      : collection.imageKey;
    return {
      ...collection,
      imageUrl: coverKey ? (coverKey.startsWith("/") ? coverKey : getR2ObjectUrl(coverKey)) : null,
    };
  });
  const vitrine = collections.filter((collection) => collection.kind === "department");
  const lines = collections.filter((collection) => collection.kind === "line");
  const featuredCount = collections.filter((collection) => collection.isFeatured).length;

  return (
    <>
      <PageHeading
        title="Coleções"
        description="Departamentos da landing e linhas B2B do catálogo."
        actions={<Link href="/admin/produtos/colecoes/novo" className={buttonVariants()}><Plus /> Nova coleção</Link>}
      />
      <CatalogAdminNav current="/admin/produtos/colecoes" />
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-base font-semibold">Vitrine da landing</h2>
          <p className="mt-1 text-sm text-muted-foreground">Os quatro departamentos que aparecem nos cards da homepage. Título, texto e capa se editam em cada item.</p>
        </div>
        {featuredCount > 4 ? (
          <p className="mb-3 text-sm text-destructive">Há {featuredCount} destaques; a homepage mostra só os 4 primeiros por ordem.</p>
        ) : null}
        {vitrine.length ? (
          <div className="grid gap-3 sm:grid-cols-2">{vitrine.map((collection) => <CollectionCard collection={collection} key={collection.id} />)}</div>
        ) : (
          <p className="rounded-lg border bg-white p-5 text-sm text-muted-foreground">Nenhum departamento cadastrado para a vitrine.</p>
        )}
      </section>
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold">Linhas B2B</h2>
          <p className="mt-1 text-sm text-muted-foreground">Filtro Coleção do catálogo. Não entram na vitrine da landing.</p>
        </div>
        {lines.length ? (
          <div className="grid gap-3 sm:grid-cols-2">{lines.map((collection) => <CollectionCard collection={collection} key={collection.id} />)}</div>
        ) : (
          <p className="rounded-lg border bg-white p-5 text-sm text-muted-foreground">Nenhuma linha B2B cadastrada.</p>
        )}
      </section>
    </>
  );
}
