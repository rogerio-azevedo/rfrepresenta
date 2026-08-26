"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 px-5" disabled={pending || disabled}>
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {pending ? "Salvando..." : children}
    </Button>
  );
}
