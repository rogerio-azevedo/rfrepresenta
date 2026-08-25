import Image from "next/image";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentContext } from "@/server/auth/context";

export const metadata = { title: "Definir senha | RF Representa" };

export default async function ChangePasswordPage() {
  const context = await getCurrentContext();
  if (!context) redirect("/login");
  if (!context.mustChangePassword) redirect("/acesso");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1ed] px-5 py-10">
      <div className="w-full max-w-md">
        <Image src="/images/brand/rf-logo.png" alt="RF Representa" width={190} height={40} className="mx-auto mb-7 h-9 w-auto" />
        <Card className="rounded-lg py-0 shadow-sm">
          <CardHeader className="border-b px-6 py-6">
            <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><KeyRound aria-hidden="true" /></div>
            <CardTitle className="text-xl">Defina sua senha</CardTitle>
            <CardDescription>Olá, {context.name}. Antes de continuar, substitua a senha provisória.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6"><ChangePasswordForm /></CardContent>
        </Card>
      </div>
    </main>
  );
}
