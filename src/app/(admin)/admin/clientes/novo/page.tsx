import { CreateClientForm } from "@/components/clients/create-client-form";
import { PageHeading } from "@/components/layout/page-heading";

export const metadata = { title: "Novo cliente | RF Representa" };

export default function NewClientPage() {
  return <><PageHeading title="Novo cliente" description="Cadastre a empresa e gere o primeiro acesso à área comercial." /><CreateClientForm /></>;
}
