"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { mergeFamilyAction, splitFamilyAction, updateFamilyAction } from "@/actions/catalog";
import { initialFormState } from "@/actions/types";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Member = { id: string; name: string; reference: string | null; isPublic: boolean; imageUrl: string | null };
type Family = { id: string; name: string; description: string; brand: string; reviewStatus: "AUTO_APPROVED" | "NEEDS_REVIEW" | "REVIEWED"; defaultProductId: string | null; members: Member[] };

export function FamilyEditor({ family }: { family: Family }) {
  const [state, action] = useActionState(updateFamilyAction.bind(null, family.id), initialFormState);
  const [selected, setSelected] = useState<string[]>([]);
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <form action={action} className="rounded-lg border bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">Apresentação da família</h2>{state.message && <Alert className="mt-4" variant={state.status === "error" ? "destructive" : "default"}><AlertDescription>{state.message}</AlertDescription></Alert>}<div className="mt-5 grid gap-5"><div className="grid gap-2"><Label htmlFor="name">Nome público</Label><Input id="name" name="name" defaultValue={family.name} required /></div><div className="grid gap-2"><Label htmlFor="brand">Marca</Label><Input id="brand" name="brand" defaultValue={family.brand} required /></div><div className="grid gap-2"><Label htmlFor="reviewStatus">Revisão</Label><select id="reviewStatus" name="reviewStatus" defaultValue={family.reviewStatus} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="AUTO_APPROVED">Agrupamento automático</option><option value="NEEDS_REVIEW">Precisa de revisão</option><option value="REVIEWED">Revisado</option></select></div><div className="grid gap-2"><Label htmlFor="defaultProductId">SKU principal</Label><select id="defaultProductId" name="defaultProductId" defaultValue={family.defaultProductId ?? ""} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="">Primeiro SKU</option>{family.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={family.description} rows={8} /></div><SubmitButton>Salvar família</SubmitButton></div></form>
    <div className="grid content-start gap-6"><section className="rounded-lg border bg-white p-5"><h2 className="text-base font-semibold">Separar SKUs</h2><p className="mt-1 text-sm text-muted-foreground">Selecione variantes e crie uma nova família.</p><div className="mt-4 grid max-h-80 gap-2 overflow-y-auto">{family.members.map((member) => <label className="flex items-center gap-3 rounded-md border p-2 text-sm" key={member.id}><input type="checkbox" checked={selected.includes(member.id)} onChange={() => setSelected((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} />{member.imageUrl && <Image src={member.imageUrl} alt="" width={36} height={36} className="size-9 rounded object-contain" />}<span className="min-w-0 truncate">{member.name}</span></label>)}</div><form action={splitFamilyAction.bind(null, family.id)} className="mt-4 grid gap-2"><input type="hidden" name="productIds" value={JSON.stringify(selected)} /><Input name="newFamilyName" placeholder="Nome da nova família" required /><Button type="submit" variant="outline" disabled={!selected.length}>Criar família com selecionados</Button></form></section>
      <section className="rounded-lg border bg-white p-5"><h2 className="text-base font-semibold">Unir com outra família</h2><p className="mt-1 text-sm text-muted-foreground">Os SKUs desta família serão movidos para o destino.</p><form action={mergeFamilyAction.bind(null, family.id)} className="mt-4 grid gap-2"><Input name="targetFamilyId" placeholder="ID da família de destino" required /><Button type="submit" variant="outline" onClick={(event) => { if (!window.confirm("Unir esta família com o destino?")) event.preventDefault(); }}>Unir famílias</Button></form></section></div>
  </div>;
}
