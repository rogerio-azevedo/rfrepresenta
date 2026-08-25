"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CredentialDialog({
  password,
}: {
  password?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!password) return null;

  async function copyPassword() {
    await navigator.clipboard.writeText(password!);
    setCopied(true);
    toast.success("Senha copiada.");
  }

  return (
    <Dialog defaultOpen>
      <DialogContent className="max-w-md rounded-lg p-6">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <KeyRound aria-hidden="true" />
          </div>
          <DialogTitle className="text-lg">Senha provisória</DialogTitle>
          <DialogDescription>
            Esta senha será exibida somente agora. O usuário deverá trocá-la no primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/50 p-3">
          <code className="min-w-0 flex-1 break-all text-base font-semibold">{password}</code>
          <Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label="Copiar senha" title="Copiar senha">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
        </div>
        <DialogFooter className="-mx-6 -mb-6 px-6">
          <Button type="button" render={<DialogClose />}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
