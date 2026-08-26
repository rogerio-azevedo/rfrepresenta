"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, PackageCheck } from "lucide-react";
import { bulkSetProductVisibilityAction } from "@/actions/products";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";

export type ProductTableRow = {
  id: string;
  name: string;
  reference: string | null;
  brand: string;
  salePrice: number | null;
  cost: number | null;
  isPublic: boolean;
  deletedAt: string | null;
  imageUrl: string | null;
};

export function ProductTable({ rows }: { rows: ProductTableRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : rows.map((row) => row.id));
  }

  function setVisibility(isPublic: boolean) {
    if (!selected.length) return;
    startTransition(async () => {
      await bulkSetProductVisibilityAction(selected, isPublic);
      window.location.reload();
    });
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{selected.length} selecionado(s)</span>
        <Button type="button" variant="outline" size="sm" disabled={!selected.length || pending} onClick={() => setVisibility(true)} title="Publicar selecionados">
          <Eye aria-hidden="true" /> Publicar
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!selected.length || pending} onClick={() => setVisibility(false)} title="Ocultar selecionados">
          <EyeOff aria-hidden="true" /> Ocultar
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Selecionar todos os produtos desta página" /></TableHead>
              <TableHead>Produto</TableHead><TableHead>Referência</TableHead><TableHead>Preço</TableHead><TableHead>Custo</TableHead><TableHead>Estado</TableHead><TableHead className="w-16"><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Selecionar ${row.name}`} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {row.imageUrl ? <Image src={row.imageUrl} alt="" width={44} height={44} className="size-11 rounded-md border object-cover" /> : <div className="flex size-11 items-center justify-center rounded-md border bg-muted"><PackageCheck className="size-4 text-muted-foreground" /></div>}
                    <div className="min-w-0"><p className="max-w-[360px] truncate font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.brand}</p></div>
                  </div>
                </TableCell>
                <TableCell>{row.reference || "-"}</TableCell>
                <TableCell>{formatCurrency(row.salePrice)}</TableCell>
                <TableCell>{formatCurrency(row.cost)}</TableCell>
                <TableCell>
                  {row.deletedAt ? <Badge variant="secondary">Arquivado</Badge> : row.isPublic ? <Badge>Publicado</Badge> : <Badge variant="outline">Privado</Badge>}
                </TableCell>
                <TableCell><Link className={buttonVariants({ variant: "ghost", size: "icon" })} href={`/admin/produtos/${row.id}`} aria-label={`Abrir ${row.name}`} title="Abrir produto"><Eye /></Link></TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {pending && <p className="mt-2 text-sm text-muted-foreground">Atualizando produtos...</p>}
      {selected.length > 0 && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3" /> Ações em lote consideram apenas esta página.</p>}
    </>
  );
}
