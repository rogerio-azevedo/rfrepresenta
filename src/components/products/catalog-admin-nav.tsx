import Link from "next/link";
import { FolderTree, Package, Tags, Upload } from "lucide-react";

const items = [
  { href: "/admin/produtos", label: "SKUs", icon: Package },
  { href: "/admin/produtos/familias", label: "Famílias", icon: Tags },
  { href: "/admin/produtos/colecoes", label: "Coleções", icon: FolderTree },
  { href: "/admin/produtos/tabela", label: "Tabela comercial", icon: Upload },
];

export function CatalogAdminNav({ current }: { current: string }) {
  return <nav className="mb-6 flex gap-1 overflow-x-auto border-b" aria-label="Gestão do catálogo">{items.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium ${current === item.href ? "border-[#b83342] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="size-4" />{item.label}</Link>; })}</nav>;
}
