"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { confirmCollectionCoverUploadAction, requestCollectionCoverUploadAction, saveCollectionAction } from "@/actions/catalog";
import { initialFormState } from "@/actions/types";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Defaults = { id?: string; name?: string; slug?: string; description?: string; imageKey?: string | null; imageUrl?: string | null; sortOrder?: number; isFeatured?: boolean; isActive?: boolean; categoryIds?: string[] };

export function CollectionForm({ defaults = {}, categories }: { defaults?: Defaults; categories: Array<{ id: string; path: string }> }) {
  const [selected, setSelected] = useState(defaults.categoryIds ?? []);
  const [cover, setCover] = useState({ objectKey: defaults.imageKey ?? "", imageUrl: defaults.imageUrl ?? "" });
  const [uploadError, setUploadError] = useState("");
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState(saveCollectionAction.bind(null, defaults.id ?? null), initialFormState);
  async function uploadCover(file: File) {
    setUploadError("");
    const requested = await requestCollectionCoverUploadAction({ fileName: file.name, contentType: file.type, sizeBytes: file.size });
    if (!requested.upload) throw new Error(requested.message || "Nao foi possivel iniciar o upload.");
    const response = await fetch(requested.upload.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("Falha no envio para o R2.");
    const confirmed = await confirmCollectionCoverUploadAction({ objectKey: requested.upload.objectKey, fileName: file.name, contentType: file.type, sizeBytes: file.size });
    if (confirmed.status === "error") throw new Error(confirmed.message || "Nao foi possivel confirmar a capa.");
    setCover({ objectKey: requested.upload.objectKey, imageUrl: requested.upload.publicUrl });
  }

  return <form action={action} className="grid gap-6"><input type="hidden" name="categoryIds" value={JSON.stringify(selected)} /><input type="hidden" name="imageKey" value={cover.objectKey} />{state.message && <Alert variant={state.status === "error" ? "destructive" : "default"}><AlertDescription>{state.message}</AlertDescription></Alert>}{uploadError && <Alert variant="destructive"><AlertDescription>{uploadError}</AlertDescription></Alert>}<section className="rounded-lg border bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">Apresentação</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="name">Nome</Label><Input id="name" name="name" defaultValue={defaults.name} required /></div><div className="grid gap-2"><Label htmlFor="slug">Slug</Label><Input id="slug" name="slug" defaultValue={defaults.slug} required /></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={defaults.description} rows={4} /></div><div className="grid gap-3 sm:col-span-2"><Label>Capa</Label>{cover.imageUrl ? <div className="flex items-center gap-4 rounded-md border p-3"><div className="relative aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={cover.imageUrl} alt="Capa da coleção" fill sizes="128px" className="object-cover" /></div><Button type="button" variant="outline" size="icon" onClick={() => setCover({ objectKey: "", imageUrl: "" })} aria-label="Remover capa" title="Remover capa"><Trash2 /></Button></div> : <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed bg-muted/30"><span className="text-sm text-muted-foreground">Sem capa</span></div>}<input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) startUpload(() => { void uploadCover(file).catch((error) => setUploadError(error instanceof Error ? error.message : "Falha no upload.")); }); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}><ImagePlus /> {uploading ? "Enviando..." : "Selecionar capa"}</Button></div><div className="grid gap-2"><Label htmlFor="sortOrder">Ordem</Label><Input id="sortOrder" name="sortOrder" type="number" min="0" defaultValue={defaults.sortOrder ?? 0} /></div><div className="flex items-end gap-5 pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={defaults.isFeatured} /> Destaque na landing</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={defaults.isActive ?? true} /> Ativa</label></div></div></section><section className="rounded-lg border bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">Categorias incluídas</h2><p className="mt-1 text-sm text-muted-foreground">Coleções podem compartilhar categorias.</p><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto sm:grid-cols-2">{categories.map((category) => <label className="flex min-h-10 items-center gap-2 rounded-md border p-2 text-sm" key={category.id}><input type="checkbox" checked={selected.includes(category.id)} onChange={() => setSelected((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])} /><span>{category.path}</span></label>)}</div></section><div className="flex justify-end"><SubmitButton disabled={uploading}>Salvar coleção</SubmitButton></div></form>;
}
