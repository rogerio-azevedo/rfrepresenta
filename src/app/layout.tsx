import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { MotionProvider } from "@/app/components/motion/motion-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "RF Representa | Altenburg para lojistas em Mato Grosso",
  description:
    "Representação comercial Altenburg para lojistas em todo o Mato Grosso. Atendimento direto com nosso time comercial.",
  applicationName: "RF Representa",
  creator: "RF Representa",
  keywords: [
    "representante Altenburg Mato Grosso",
    "RF Representa",
    "cama e banho para lojistas",
    "travesseiros Altenburg",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "RF Representa",
    title: "RF Representa | Altenburg em Mato Grosso",
    description:
      "Atendimento comercial Altenburg para lojistas em todo o estado de Mato Grosso.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RF Representa | Altenburg em Mato Grosso",
    description:
      "Atendimento comercial Altenburg para lojistas em todo o estado de Mato Grosso.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#1d211f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`} data-scroll-behavior="smooth">
      <body>
        <noscript>
          <style>{`.motion-fallback,.mask-line-inner,.clip-reveal,.fade-in{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
        </noscript>
        <MotionProvider>
          {children}
          <Toaster position="top-right" richColors />
        </MotionProvider>
      </body>
    </html>
  );
}
