import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeading } from "@/components/layout/page-heading";
import { formatPhone, formatTaxId } from "@/lib/formatters";
import { listClients } from "@/server/dal/clients";

export const metadata = { title: "Clientes | RF Representa" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const clients = await listClients(params.q, params.status);
  return (
    <>
      <PageHeading title="Clientes" description="Empresas com acesso à área comercial." actions={<Link href="/admin/clientes/novo" className={buttonVariants()}><Plus /> Novo cliente</Link>} />
      <form className="mb-5 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_180px_auto]" method="get">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={params.q} placeholder="Nome, documento ou código" className="h-10 pl-9" /></div>
        <select name="status" defaultValue={params.status ?? "ALL"} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="ALL">Todos os status</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select>
        <Button type="submit" className="h-10">Filtrar</Button>
      </form>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table className="min-w-[760px]">
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Documento</TableHead><TableHead>Contato</TableHead><TableHead>Status</TableHead><TableHead className="w-16"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {clients.map((client) => <TableRow key={client.id}><TableCell><p className="font-medium">{client.tradeName || client.legalName}</p><p className="text-xs text-muted-foreground">{client.externalCode || client.legalName}</p></TableCell><TableCell>{formatTaxId(client.taxId)}</TableCell><TableCell><p>{client.contactName || "-"}</p><p className="text-xs text-muted-foreground">{formatPhone(client.contactPhone)}</p></TableCell><TableCell><Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>{client.status === "ACTIVE" ? "Ativo" : "Inativo"}</Badge></TableCell><TableCell><Link className={buttonVariants({ variant: "ghost", size: "icon" })} href={`/admin/clientes/${client.id}`} aria-label={`Abrir ${client.tradeName || client.legalName}`} title="Abrir cliente"><Eye /></Link></TableCell></TableRow>)}
            {clients.length === 0 && <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
