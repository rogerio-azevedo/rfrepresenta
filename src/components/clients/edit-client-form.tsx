"use client";

import { useActionState } from "react";
import { updateClientAction } from "@/actions/clients";
import { initialFormState } from "@/actions/types";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientFormFields } from "./client-form-fields";

type ClientDefaults = React.ComponentProps<typeof ClientFormFields>["defaults"];

export function EditClientForm({ clientId, defaults }: { clientId: string; defaults: ClientDefaults }) {
  const action = updateClientAction.bind(null, clientId);
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="grid gap-5">
      {state.message && (
        <Alert variant={state.status === "error" ? "destructive" : "default"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <ClientFormFields defaults={defaults} errors={state.errors} />
      <div className="flex justify-end"><SubmitButton>Salvar alterações</SubmitButton></div>
    </form>
  );
}
