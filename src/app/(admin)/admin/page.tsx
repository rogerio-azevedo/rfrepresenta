import Link from "next/link";
import { ArrowRight, CircleCheck, CircleOff, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/layout/page-heading";
import { getClientCounts, listClients } from "@/server/dal/clients";
import { formatTaxId } from "@/lib/formatters";

export const metadata = { title: "Administração | RF Representa" };

export default async function AdminDashboardPage() {
  const [counts, recentClients] = await Promise.all([getClientCounts(), listClients()]);
  return (
    <>
      <PageHeading title="Visão geral" description="Acompanhe a base de clientes e os acessos ao catálogo." actions={<Link href="/admin/clientes/novo" className={buttonVariants()}>Novo cliente</Link>} />
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo de clientes">
        {[
          { label: "Clientes", value: counts.total, icon: Users, tone: "text-foreground" },
          { label: "Ativos", value: counts.active, icon: CircleCheck, tone: "text-emerald-700" },
          { label: "Inativos", value: counts.inactive, icon: CircleOff, tone: "text-amber-700" },
        ].map((item) => <div key={item.label} className="rounded-lg border bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{item.label}</p><item.icon className={`size-5 ${item.tone}`} /></div><p className="mt-4 text-3xl font-semibold">{item.value}</p></div>)}
      </section>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Clientes recentes</h2><Link href="/admin/clientes" className={buttonVariants({ variant: "ghost" })}>Ver todos <ArrowRight /></Link></div>
        <div className="divide-y rounded-lg border bg-white">
          {recentClients.slice(0, 5).map((client) => <Link key={client.id} href={`/admin/clientes/${client.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"><div className="min-w-0"><p className="truncate font-medium">{client.tradeName || client.legalName}</p><p className="mt-1 text-sm text-muted-foreground">{formatTaxId(client.taxId)}</p></div><span className={`shrink-0 text-xs font-medium ${client.status === "ACTIVE" ? "text-emerald-700" : "text-muted-foreground"}`}>{client.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></Link>)}
          {recentClients.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}
        </div>
      </section>
    </>
  );
}
