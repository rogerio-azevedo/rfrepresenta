"use client";

import { useActionState, useState, useTransition } from "react";
import { Ban, CircleCheck, KeyRound, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CredentialActionState } from "@/actions/clients";
import { createClientUserAction, resetClientUserPasswordAction, setClientUserStatusAction } from "@/actions/users";
import { CredentialDialog } from "@/components/auth/credential-dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/formatters";

type Access = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const initialState: CredentialActionState = { status: "idle" };

export function AccessManager({ clientId, accesses }: { clientId: string; accesses: Access[] }) {
  const createAction = createClientUserAction.bind(null, clientId);
  const [state, formAction] = useActionState(createAction, initialState);
  const [resetPasswordValue, setResetPasswordValue] = useState<string>();
  const [pending, startTransition] = useTransition();

  function resetPassword(userId: string) {
    startTransition(async () => {
      const result = await resetClientUserPasswordAction(userId, clientId);
      setResetPasswordValue(result.temporaryPassword);
      toast.success("Senha redefinida.");
    });
  }

  function toggleStatus(user: Access) {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      await setClientUserStatusAction(user.id, clientId, nextStatus);
      toast.success(nextStatus === "ACTIVE" ? "Acesso reativado." : "Acesso desativado.");
    });
  }

  return (
    <div className="grid gap-7">
      <form
        action={formAction}
        className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={() => setResetPasswordValue(undefined)}
      >
        <div className="grid gap-2">
          <Label htmlFor="accessName">Nome</Label>
          <Input id="accessName" name="name" className="h-10 bg-white" required aria-invalid={Boolean(state.errors?.name)} />
          {state.errors?.name?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="accessEmail">E-mail</Label>
          <Input id="accessEmail" name="email" type="email" className="h-10 bg-white" required aria-invalid={Boolean(state.errors?.email)} />
          {state.errors?.email?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
        </div>
        <SubmitButton><Plus aria-hidden="true" /> Novo acesso</SubmitButton>
        {state.message && state.status === "error" && <p className="text-sm text-destructive sm:col-span-3">{state.message}</p>}
      </form>

      <div className="divide-y rounded-lg border bg-white">
        {accesses.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhum acesso cadastrado.</p>}
        {accesses.map((access) => (
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center" key={access.id}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{access.name}</p>
                <Badge variant={access.status === "ACTIVE" ? "default" : "secondary"}>{access.status === "ACTIVE" ? "Ativo" : "Inativo"}</Badge>
                {access.mustChangePassword && <Badge variant="outline">Troca pendente</Badge>}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{access.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Último acesso: {formatDate(access.lastLoginAt)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="icon" disabled={pending} onClick={() => resetPassword(access.id)} aria-label={`Redefinir senha de ${access.name}`} title="Redefinir senha">
                {pending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
              </Button>
              <Button type="button" variant="outline" size="icon" disabled={pending} onClick={() => toggleStatus(access)} aria-label={`${access.status === "ACTIVE" ? "Desativar" : "Reativar"} ${access.name}`} title={access.status === "ACTIVE" ? "Desativar acesso" : "Reativar acesso"}>
                {access.status === "ACTIVE" ? <Ban /> : <CircleCheck />}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <CredentialDialog
        key={resetPasswordValue ?? state.temporaryPassword}
        password={resetPasswordValue ?? state.temporaryPassword}
      />
    </div>
  );
}
