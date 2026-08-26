import Image from "next/image";
import Link from "next/link";
import { LogIn, LogOut, MessageCircle, UserRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import type { CatalogViewer } from "@/server/dal/catalog";
import { buildWhatsAppUrl } from "@/app/site-config";

export function CatalogHeader({ viewer }: { viewer: CatalogViewer }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="RF Representa - início" className="shrink-0">
          <Image src="/images/brand/rf-logo.png" alt="RF Representa" width={176} height={35} className="h-8 w-auto" priority />
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-3" aria-label="Navegação do catálogo">
          <Link href="/" className="hidden px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex">Início</Link>
          <a href={buildWhatsAppUrl("Olá! Estou consultando o catálogo da RF Representa e preciso de ajuda.")} target="_blank" rel="noreferrer" className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted" aria-label="Falar no WhatsApp" title="Falar no WhatsApp"><MessageCircle className="size-5" /></a>
          {viewer.kind === "client" ? (
            <>
              <span className="hidden max-w-52 truncate text-sm font-medium md:inline">{viewer.clientName}</span>
              <form action={logoutAction}><button type="submit" className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted" aria-label="Sair" title="Sair"><LogOut className="size-5" /></button></form>
            </>
          ) : (
            <Link href="/login?callbackUrl=/catalogo" aria-label="Área do cliente" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b83342] px-3 text-sm font-semibold text-white hover:bg-[#9f2938]">
              <LogIn className="size-4" /><span className="hidden sm:inline">Área do cliente</span><UserRound className="size-4 sm:hidden" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
