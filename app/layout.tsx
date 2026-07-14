import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Simulados",
  description: "Simulados a partir de bancos locais importados por curso."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
