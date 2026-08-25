"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/auth";
import { initialFormState } from "@/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "./submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialFormState);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" className="h-11" required />
        <p className="text-xs text-muted-foreground">Use pelo menos 12 caracteres.</p>
        {state.errors?.password?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="h-11" required />
        {state.errors?.confirmPassword?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
      </div>
      <SubmitButton>Definir nova senha</SubmitButton>
    </form>
  );
}
