"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { createProductAction, updateProductAction, type ProductActionState } from "@/actions/products";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProductDefaults = {
  id?: string;
  externalId?: string | null;
  reference?: string | null;
  ean?: string | null;
  name?: string;
  description?: string;
  brand?: string;
  sourcePrice?: string | number | null;
  salePrice?: string | number | null;
  cost?: string | number | null;
  categoryPaths?: string[];
  specifications?: Record<string, unknown>;
};

const initialState: ProductActionState = { status: "idle" };

function specRowsFromValue(value: Record<string, unknown>) {
  return Object.entries(value).map(([key, current]) => ({ key, value: Array.isArray(current) ? current.join(" | ") : String(current ?? "") }));
}

export function ProductForm({ defaults = {}, backHref = "/admin/produtos" }: { defaults?: ProductDefaults; backHref?: string }) {
  const action = defaults.id ? updateProductAction.bind(null, defaults.id) : createProductAction;
  const [state, formAction] = useActionState(action, initialState);
  const [categories, setCategories] = useState((defaults.categoryPaths ?? []).join("\n"));
  const [specRows, setSpecRows] = useState(() => specRowsFromValue(defaults.specifications ?? {}));
  const specifications = useMemo(() => Object.fromEntries(specRows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value.includes(" | ") ? row.value.split(" | ").map((item) => item.trim()).filter(Boolean) : row.value.trim()])), [specRows]);
  const categoryValues = useMemo(() => categories.split(/\n|,/).map((item) => item.trim()).filter(Boolean), [categories]);
  const fieldErrors = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-8">
      {state.message && state.status === "error" && <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert>}
      <input type="hidden" name="categories" value={JSON.stringify(categoryValues)} readOnly />
      <input type="hidden" name="specifications" value={JSON.stringify(specifications)} readOnly />
      <section className="rounded-lg border bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Dados comerciais</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="name">Nome</Label><Input id="name" name="name" defaultValue={defaults.name} required />{fieldErrors.name?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}</div>
          <div className="grid gap-2"><Label htmlFor="reference">Referência</Label><Input id="reference" name="reference" defaultValue={defaults.reference ?? ""} />{fieldErrors.reference?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}</div>
          <div className="grid gap-2"><Label htmlFor="ean">EAN</Label><Input id="ean" name="ean" inputMode="numeric" defaultValue={defaults.ean ?? ""} />{fieldErrors.ean?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}</div>
          <div className="grid gap-2"><Label htmlFor="brand">Marca</Label><Input id="brand" name="brand" defaultValue={defaults.brand} required />{fieldErrors.brand?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}</div>
          <div className="grid gap-2"><Label htmlFor="externalId">ID externo</Label><Input id="externalId" name="externalId" defaultValue={defaults.externalId ?? ""} /></div>
          <div className="grid gap-2"><Label htmlFor="sourcePrice">Preço de origem (histórico)</Label><Input id="sourcePrice" type="number" value={defaults.sourcePrice ?? ""} readOnly disabled /></div>
          <div className="grid gap-2"><Label htmlFor="salePrice">Preço comercial</Label><Input id="salePrice" name="salePrice" type="number" min="0" step="0.01" defaultValue={defaults.salePrice ?? ""} />{fieldErrors.salePrice?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}</div>
          <div className="grid gap-2"><Label htmlFor="cost">Custo interno</Label><Input id="cost" name="cost" type="number" min="0" step="0.01" defaultValue={defaults.cost ?? ""} />{fieldErrors.cost?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}</div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={defaults.description} rows={6} /></div>
        </div>
      </section>
      <section className="rounded-lg border bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Categorias</h2>
        <p className="mt-1 text-sm text-muted-foreground">Um caminho por linha.</p>
        <Textarea className="mt-4" value={categories} onChange={(event) => setCategories(event.target.value)} rows={5} placeholder="Travesseiro/Luxo" aria-label="Categorias do produto" />
      </section>
      <section className="rounded-lg border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Especificações</h2><p className="mt-1 text-sm text-muted-foreground">Use “ | ” para valores múltiplos.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setSpecRows((rows) => [...rows, { key: "", value: "" }])}>Adicionar campo</Button></div>
        <div className="mt-4 grid gap-3">{specRows.map((row, index) => <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]" key={`${index}-${row.key}`}><Input value={row.key} onChange={(event) => setSpecRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))} placeholder="Campo" aria-label={`Nome da especificação ${index + 1}`} /><Input value={row.value} onChange={(event) => setSpecRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="Valor" aria-label={`Valor da especificação ${index + 1}`} /><Button type="button" variant="ghost" size="icon" onClick={() => setSpecRows((rows) => rows.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover especificação" title="Remover especificação">×</Button></div>)}</div>
      </section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Link href={backHref} className={buttonVariants({ variant: "outline" })}><ArrowLeft aria-hidden="true" /> Voltar</Link><SubmitButton>{defaults.id ? "Salvar alterações" : "Criar produto"}</SubmitButton></div>
    </form>
  );
}
