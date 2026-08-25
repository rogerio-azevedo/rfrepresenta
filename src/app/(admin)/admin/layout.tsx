import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentContext } from "@/server/auth/context";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await getCurrentContext();
  if (!context) redirect("/login");
  if (context.mustChangePassword) redirect("/trocar-senha");
  if (context.kind !== "admin") redirect("/catalogo");
  return <AppShell user={{ name: context.name, email: context.email, role: context.role, clientName: null }}>{children}</AppShell>;
}
