"use client";

import { useTransition } from "react";
import { Ban, CircleCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { setClientStatusAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";

export function ClientStatusControl({ clientId, status }: { clientId: string; status: "ACTIVE" | "INACTIVE" }) {
  const [pending, startTransition] = useTransition();
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <Button variant={status === "ACTIVE" ? "outline" : "default"} disabled={pending} onClick={() => startTransition(async () => {
      await setClientStatusAction(clientId, nextStatus);
      toast.success(nextStatus === "ACTIVE" ? "Cliente reativado." : "Cliente desativado.");
    })}>
      {pending ? <LoaderCircle className="animate-spin" /> : status === "ACTIVE" ? <Ban /> : <CircleCheck />}
      {status === "ACTIVE" ? "Desativar" : "Reativar"}
    </Button>
  );
}
