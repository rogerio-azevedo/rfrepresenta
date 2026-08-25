import { BookOpen, CheckCircle2 } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { requireClientContext } from "@/server/auth/context";

export const metadata = { title: "Catálogo | RF Representa" };

export default async function CatalogPage() {
  const context = await requireClientContext();
  return (
    <>
      <PageHeading title="Catálogo" description={context.clientName} />
      <section className="min-h-[420px] rounded-lg border bg-white p-6 sm:p-10">
        <div className="flex max-w-xl flex-col items-start">
          <div className="flex size-12 items-center justify-center rounded-md bg-[#e7eceb] text-[#2c4639]"><BookOpen aria-hidden="true" /></div>
          <h2 className="mt-6 text-xl font-semibold">Área comercial preparada</h2>
          <p className="mt-2 leading-7 text-muted-foreground">Seu acesso está ativo. O catálogo digital será disponibilizado neste espaço.</p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" /> Acesso vinculado ao cliente</div>
        </div>
      </section>
    </>
  );
}
