import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/layout/page-heading";
import { ProductControls } from "@/components/products/product-controls";
import { ProductForm } from "@/components/products/product-form";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { getR2ObjectUrl } from "@/server/catalog/r2";
import { getAdminProduct } from "@/server/dal/products";
import { ResourceNotFoundError } from "@/server/auth/errors";

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  try { const product = await getAdminProduct(productId); return { title: `${product.name} | Produtos` }; } catch { return { title: "Produto | RF Representa" }; }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  let product;
  try { product = await getAdminProduct(productId); } catch (error) { if (error instanceof ResourceNotFoundError) notFound(); throw error; }
  return <><PageHeading title={product.name} description={product.reference || "Produto sem referência"} actions={<><Badge variant={product.deletedAt ? "secondary" : product.isPublic ? "default" : "outline"}>{product.deletedAt ? "Arquivado" : product.isPublic ? "Publicado" : "Privado"}</Badge><ProductControls productId={product.id} isPublic={product.isPublic} archived={Boolean(product.deletedAt)} /></>} /><div className="grid gap-8"><ProductImageGallery productId={product.id} disabled={Boolean(product.deletedAt)} initialImages={product.images.map((image) => ({ ...image, imageUrl: getR2ObjectUrl(image.objectKey) }))} /><ProductForm defaults={product} /></div></>;
}
