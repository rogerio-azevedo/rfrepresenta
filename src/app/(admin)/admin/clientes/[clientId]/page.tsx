import { notFound } from "next/navigation";
import { AccessManager } from "@/components/clients/access-manager";
import { ClientStatusControl } from "@/components/clients/client-status-control";
import { EditClientForm } from "@/components/clients/edit-client-form";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/layout/page-heading";
import { ResourceNotFoundError } from "@/server/auth/errors";
import { getClientById } from "@/server/dal/clients";
import { listClientUsers } from "@/server/dal/users";

export default async function ClientDetailsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  let client;
  let accesses;

  try {
    [client, accesses] = await Promise.all([getClientById(clientId), listClientUsers(clientId)]);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) notFound();
    throw error;
  }

  return (
    <>
      <PageHeading
        title={client.tradeName || client.legalName}
        description={client.legalName}
        actions={
          <>
            <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
              {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
            </Badge>
            <ClientStatusControl clientId={client.id} status={client.status} />
          </>
        }
      />
      <div className="grid gap-8">
        <section className="rounded-lg border bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold">Dados comerciais</h2>
            <p className="mt-1 text-sm text-muted-foreground">Informações de identificação e contato.</p>
          </div>
          <EditClientForm clientId={client.id} defaults={client} />
        </section>
        <section className="rounded-lg border bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold">Acessos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pessoas autorizadas a entrar pelo cliente.</p>
          </div>
          <AccessManager clientId={client.id} accesses={accesses} />
        </section>
      </div>
    </>
  );
}
