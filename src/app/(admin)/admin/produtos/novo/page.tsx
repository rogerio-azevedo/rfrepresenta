import { PageHeading } from "@/components/layout/page-heading";
import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "Novo produto | RF Representa" };

export default function NewProductPage() {
  return <><PageHeading title="Novo produto" description="Cadastre um SKU privado e prepare sua galeria." /><ProductForm /></>;
}
