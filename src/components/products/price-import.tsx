"use client";

import { useState, useTransition } from "react";
import { FileCheck2, Upload } from "lucide-react";
import { applyPriceCsvAction, validatePriceCsvAction, type PriceImportState } from "@/actions/catalog";
import { Button } from "@/components/ui/button";

export function PriceImport() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<PriceImportState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  function run(mode: "validate" | "apply") {
    if (!file) return;
    const data = new FormData(); data.set("file", file);
    startTransition(async () => setState(await (mode === "validate" ? validatePriceCsvAction : applyPriceCsvAction)(state, data)));
  }
  return <section className="rounded-lg border bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">Importar tabela CSV</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Cabeçalhos: referencia ou ean, preco_comercial e custo opcional. A aplicação só ocorre quando todas as linhas forem válidas.</p><input type="file" accept=".csv,text/csv" className="mt-5 block w-full rounded-md border p-3 text-sm" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setState({ status: "idle" }); }} /><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!file || pending} onClick={() => run("validate")}><FileCheck2 /> Validar arquivo</Button><Button type="button" disabled={!file || pending || state.status !== "success" || !state.report || state.report.missing.length > 0} onClick={() => { if (window.confirm("Aplicar esta tabela comercial?")) run("apply"); }}><Upload /> Aplicar tabela</Button></div>{state.message && <p className={`mt-4 whitespace-pre-line rounded-md border p-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}{state.report && <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div className="rounded-md bg-muted p-3"><strong>{state.report.rows}</strong><br />linhas válidas</div><div className="rounded-md bg-muted p-3"><strong>{state.report.matched}</strong><br />produtos encontrados</div><div className="rounded-md bg-muted p-3"><strong>{state.report.missing.length}</strong><br />não encontrados</div>{state.report.missing.length > 0 && <p className="sm:col-span-3 text-destructive">Não encontrados: {state.report.missing.slice(0, 20).join(", ")}</p>}</div>}</section>;
}
