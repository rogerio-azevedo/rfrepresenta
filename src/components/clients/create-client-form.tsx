"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClientAction, type CredentialActionState } from "@/actions/clients";
import { CredentialDialog } from "@/components/auth/credential-dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientFormFields } from "./client-form-fields";

const initialState: CredentialActionState = { status: "idle" };

export function CreateClientForm() {
  const [state, action] = useActionState(createClientAction, initialState);

  return (
    <>
      <form action={action} className="grid gap-8">
        {state.message && state.status === "error" && <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert>}
        <section className="rounded-lg border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Dados comerciais</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Identificação básica da empresa cliente.</p>
          <ClientFormFields errors={state.errors} />
        </section>
        <section className="rounded-lg border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Primeiro acesso</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">A senha provisória será gerada após salvar.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="userName">Nome do usuário</Label>
              <Input id="userName" name="userName" className="h-10" required aria-invalid={Boolean(state.errors?.userName)} />
              {state.errors?.userName?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="userEmail">E-mail de acesso</Label>
              <Input id="userEmail" name="userEmail" type="email" className="h-10" required aria-invalid={Boolean(state.errors?.userEmail)} />
              {state.errors?.userEmail?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
            </div>
          </div>
        </section>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link href="/admin/clientes" className={buttonVariants({ variant: "outline" })}><ArrowLeft aria-hidden="true" /> Voltar</Link>
          {state.status === "success" && state.clientId ? (
            <Link href={`/admin/clientes/${state.clientId}`} className={buttonVariants()}><ExternalLink aria-hidden="true" /> Abrir cliente</Link>
          ) : <SubmitButton>Criar cliente e acesso</SubmitButton>}
        </div>
      </form>
      <CredentialDialog key={state.temporaryPassword} password={state.temporaryPassword} />
    </>
  );
}
