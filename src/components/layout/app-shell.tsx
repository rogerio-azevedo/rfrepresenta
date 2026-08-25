"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Store,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { UiStoreProvider, useUiStore } from "@/stores/ui-store-provider";

type ShellUser = {
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT";
  clientName: string | null;
};

const adminNavigation = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
];
const clientNavigation = [
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
];

function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const navigation = user.role === "ADMIN" ? adminNavigation : clientNavigation;
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center border-b border-sidebar-border px-5">
        <Image src="/images/brand/rf-logo-white.png" alt="RF Representa" width={176} height={35} className="h-8 w-auto" priority />
      </div>
      <div className="px-5 py-5">
        <p className="text-xs font-semibold uppercase text-sidebar-foreground/55">{user.role === "ADMIN" ? "Administração" : "Cliente"}</p>
        {user.clientName && <p className="mt-1 truncate text-sm font-medium">{user.clientName}</p>}
      </div>
      <nav className="grid gap-1 px-3" aria-label="Navegação da área restrita">
        {navigation.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent", active && "bg-sidebar-accent text-sidebar-accent-foreground")}>
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="mb-3 min-w-0 px-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/55">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut aria-hidden="true" /> Sair
          </Button>
        </form>
      </div>
    </div>
  );
}

function ShellFrame({ user, children }: { user: ShellUser; children: ReactNode }) {
  const open = useUiStore((state) => state.mobileNavigationOpen);
  const setOpen = useUiStore((state) => state.setMobileNavigationOpen);
  return (
    <div className="min-h-screen bg-[#f6f7f4] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><SidebarContent user={user} /></aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 max-w-[86vw] border-0 p-0" showCloseButton={false}>
          <SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle></SheetHeader>
          <SidebarContent user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu aria-hidden="true" />
          </Button>
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Store className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Área restrita RF Representa</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function AppShell(props: { user: ShellUser; children: ReactNode }) {
  return <UiStoreProvider><ShellFrame {...props} /></UiStoreProvider>;
}
