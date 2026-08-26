import Link from "next/link";
import { Plus } from "lucide-react";
import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listAdminCollections } from "@/server/dal/catalog-admin";

export const metadata = { title: "Coleções | Produtos" };

export default async function CollectionsPage() {
  const collections = await listAdminCollections();
  return <><PageHeading title="Coleções" description="Navegação editorial e destaques da landing." actions={<Link href="/admin/produtos/colecoes/novo" className={buttonVariants()}><Plus /> Nova coleção</Link>} /><CatalogAdminNav current="/admin/produtos/colecoes" /><div className="grid gap-3 sm:grid-cols-2">{collections.map((collection) => <article className="rounded-lg border bg-white p-5" key={collection.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{collection.name}</h2><p className="mt-1 text-sm text-muted-foreground">/{collection.slug} • {Number(collection.categoryCount)} categorias</p></div><div className="flex gap-1">{collection.isFeatured && <Badge>Destaque</Badge>}<Badge variant={collection.isActive ? "secondary" : "outline"}>{collection.isActive ? "Ativa" : "Inativa"}</Badge></div></div><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{collection.description}</p><Link className={buttonVariants({ variant: "outline", className: "mt-4" })} href={`/admin/produtos/colecoes/${collection.id}`}>Editar</Link></article>)}</div></>;
}
