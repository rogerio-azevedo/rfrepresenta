"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { initialFormState } from "@/actions/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "./submit-button";

export function LoginForm({ callbackUrl = "/acesso" }: { callbackUrl?: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="h-11"
          aria-invalid={Boolean(state.errors?.email)}
          required
        />
        {state.errors?.email?.map((error) => (
          <p className="text-sm text-destructive" key={error}>{error}</p>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={Boolean(state.errors?.password)}
          required
        />
        {state.errors?.password?.map((error) => (
          <p className="text-sm text-destructive" key={error}>{error}</p>
        ))}
      </div>
      <SubmitButton>Entrar</SubmitButton>
    </form>
  );
}
