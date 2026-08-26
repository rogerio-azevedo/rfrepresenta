"use client";

import { useTransition } from "react";
import { Archive, Eye, EyeOff, RotateCcw } from "lucide-react";
import { archiveProductAction, restoreProductAction, setProductVisibilityAction } from "@/actions/products";
import { Button } from "@/components/ui/button";

export function ProductControls({ productId, isPublic, archived }: { productId: string; isPublic: boolean; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<void>) { startTransition(() => { void action().then(() => window.location.reload()); }); }
  if (archived) return <Button variant="outline" disabled={pending} onClick={() => run(() => restoreProductAction(productId))}><RotateCcw aria-hidden="true" /> Restaurar</Button>;
  return <div className="flex flex-wrap gap-2"><Button variant={isPublic ? "outline" : "default"} disabled={pending} onClick={() => run(() => setProductVisibilityAction(productId, !isPublic))}>{isPublic ? <><EyeOff aria-hidden="true" /> Despublicar</> : <><Eye aria-hidden="true" /> Publicar</>}</Button><Button variant="outline" disabled={pending} onClick={() => run(() => archiveProductAction(productId))}><Archive aria-hidden="true" /> Arquivar</Button></div>;
}
