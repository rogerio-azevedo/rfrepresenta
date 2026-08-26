import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/products/collection-form";
import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { PageHeading } from "@/components/layout/page-heading";
import { getAdminCollection, listAllCategoriesForAdmin } from "@/server/dal/catalog-admin";
import { ResourceNotFoundError } from "@/server/auth/errors";
import { getR2ObjectUrl } from "@/server/catalog/r2";

export default async function CollectionPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  let collection;
  try { collection = await getAdminCollection(collectionId); } catch (error) { if (error instanceof ResourceNotFoundError) notFound(); throw error; }
  const categories = await listAllCategoriesForAdmin();
  const defaults = { ...collection, imageUrl: collection.imageKey ? getR2ObjectUrl(collection.imageKey) : null };
  return <><PageHeading title={collection.name} description="Configuração da coleção editorial." /><CatalogAdminNav current="/admin/produtos/colecoes" /><CollectionForm defaults={defaults} categories={categories.map(({ id, path }) => ({ id, path }))} /></>;
}
