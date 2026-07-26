import "@fontsource-variable/archivo";
import "@fontsource-variable/newsreader";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rota DATAPREV 2026",
  description:
    "Plano de estudos, simulados e estatísticas para o Perfil 2 da DATAPREV.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
