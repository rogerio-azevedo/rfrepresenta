import { CollectionForm } from "@/components/products/collection-form";
import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { PageHeading } from "@/components/layout/page-heading";
import { listAllCategoriesForAdmin } from "@/server/dal/catalog-admin";

export default async function NewCollectionPage() {
  const categories = await listAllCategoriesForAdmin();
  return <><PageHeading title="Nova coleção" description="Agrupe categorias para a navegação pública." /><CatalogAdminNav current="/admin/produtos/colecoes" /><CollectionForm categories={categories.map(({ id, path }) => ({ id, path }))} /></>;
}
