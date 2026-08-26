"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { confirmProductImageAction, removeProductImageAction, reorderProductImagesAction, requestProductImageUploadAction } from "@/actions/products";
import { Button } from "@/components/ui/button";

type ImageItem = { id: string; objectKey: string; imageUrl: string; originalName: string; altText: string; position: number };

export function ProductImageGallery({ productId, initialImages, disabled = false }: { productId: string; initialImages: ImageItem[]; disabled?: boolean }) {
  const [images, setImages] = useState(initialImages);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const requested = await requestProductImageUploadAction({ productId, fileName: file.name, contentType: file.type, sizeBytes: file.size });
    if (!requested.upload) throw new Error(requested.message || "Nao foi possivel iniciar o upload.");
    const response = await fetch(requested.upload.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("Falha no envio para o R2.");
    const confirmed = await confirmProductImageAction({ productId, objectKey: requested.upload.objectKey, originalName: file.name, contentType: file.type, sizeBytes: file.size, altText: file.name });
    if (confirmed.status === "error") throw new Error(confirmed.message || "Nao foi possivel confirmar a imagem.");
    window.location.reload();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next.map((image, position) => ({ ...image, position })));
    startTransition(() => { void reorderProductImagesAction({ productId, imageIds: next.map((image) => image.id) }); });
  }

  return <section className="rounded-lg border bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Galeria</h2><p className="mt-1 text-sm text-muted-foreground">A primeira imagem é a principal.</p></div><><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={disabled || pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) startTransition(() => { void upload(file).catch((error) => window.alert(error instanceof Error ? error.message : "Falha no upload.")); }); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" disabled={disabled || pending || images.length >= 20} onClick={() => inputRef.current?.click()}><ImagePlus aria-hidden="true" /> Adicionar imagem</Button></></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{images.map((image, index) => <div className="overflow-hidden rounded-md border" key={image.id}><div className="relative aspect-square"><Image src={image.imageUrl} alt={image.altText || ""} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" /></div><div className="flex items-center justify-between gap-1 p-2"><span className="truncate text-xs text-muted-foreground">{index === 0 ? "Principal" : `Imagem ${index + 1}`}</span><div className="flex"><Button type="button" variant="ghost" size="icon" disabled={pending || index === 0} onClick={() => move(index, -1)} aria-label="Mover imagem para cima" title="Mover para cima"><ArrowUp /></Button><Button type="button" variant="ghost" size="icon" disabled={pending || index === images.length - 1} onClick={() => move(index, 1)} aria-label="Mover imagem para baixo" title="Mover para baixo"><ArrowDown /></Button><Button type="button" variant="ghost" size="icon" disabled={pending} onClick={() => startTransition(() => { void removeProductImageAction(productId, image.id).then(() => setImages((current) => current.filter((item) => item.id !== image.id))); })} aria-label="Remover imagem" title="Remover imagem"><Trash2 /></Button></div></div></div>)}{!images.length && <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada.</p>}</div></section>;
}
