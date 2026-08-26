import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { PriceImport } from "@/components/products/price-import";
import { PageHeading } from "@/components/layout/page-heading";

export const metadata = { title: "Tabela comercial | Produtos" };

export default function CommercialPricePage() {
  return <><PageHeading title="Tabela comercial" description="Preço único para todos os clientes ativos." /><CatalogAdminNav current="/admin/produtos/tabela" /><PriceImport /><section className="mt-6 rounded-lg border bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">Regras de segurança</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">O preço comercial é exibido apenas para clientes autenticados. Custo e preço de origem nunca são enviados ao catálogo público.</p></section></>;
}
