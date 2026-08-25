import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Entrar | RF Representa",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen overflow-hidden bg-[#f3f5f1] lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]">
      <section className="relative hidden min-h-screen lg:block">
        <Image src="/images/altenburg/cama-serenity.jpg" alt="Ambiente de cama Altenburg" fill priority sizes="60vw" className="object-cover" />
        <div className="absolute inset-0 bg-[#19241f]/55" aria-hidden="true" />
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-between p-12 text-white xl:p-16">
          <Image src="/images/brand/rf-logo-white.png" alt="RF Representa" width={205} height={42} className="h-10 w-auto self-start" />
          <div>
            <p className="mb-4 text-sm font-semibold uppercase">Área do cliente</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">Seu acesso comercial, em um ambiente reservado.</h1>
            <div className="mt-8 flex items-center gap-3 text-sm text-white/75"><ShieldCheck aria-hidden="true" className="size-5" /> Acesso individual e protegido</div>
          </div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar ao site</Link>
          <Card className="rounded-lg py-0 shadow-sm">
            <CardHeader className="border-b px-6 py-6">
              <Image src="/images/brand/rf-logo.png" alt="RF Representa" width={176} height={36} className="mb-5 h-8 w-auto lg:hidden" />
              <CardTitle className="text-2xl">
                <h1 className="text-2xl font-semibold">Entrar</h1>
              </CardTitle>
              <CardDescription>Use o e-mail e a senha fornecidos pela RF Representa.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {params.senha === "alterada" && <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Senha atualizada. Entre novamente para continuar.</p>}
              <LoginForm />
              <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Para recuperar o acesso, entre em contato com o representante.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
