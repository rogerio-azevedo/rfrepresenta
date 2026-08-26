"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setFilteredProductVisibilityAction } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import type { ProductListQuery } from "@/schemas/products";

export function FilteredVisibilityControls({ query, total }: { query: ProductListQuery; total: number }) {
  const [pending, startTransition] = useTransition();
  function update(isPublic: boolean) {
    if (!window.confirm(`${isPublic ? "Publicar" : "Ocultar"} os ${total} produtos encontrados por este filtro?`)) return;
    startTransition(async () => {
      const result = await setFilteredProductVisibilityAction(query, isPublic);
      window.alert(`${result.updated} produto(s) atualizado(s).`);
      window.location.reload();
    });
  }
  return <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-white p-3"><span className="mr-auto text-sm text-muted-foreground">Ações sobre todos os {total} resultados</span><Button variant="outline" disabled={!total || pending} onClick={() => update(true)}><Eye /> Publicar resultados</Button><Button variant="outline" disabled={!total || pending} onClick={() => update(false)}><EyeOff /> Ocultar resultados</Button></div>;
}
