import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/context";

export default async function AccessRouterPage() {
  const context = await getCurrentContext();
  if (!context) redirect("/login");
  if (context.mustChangePassword) redirect("/trocar-senha");
  redirect(context.kind === "admin" ? "/admin" : "/catalogo");
}
