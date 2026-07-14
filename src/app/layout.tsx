import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Consórcio Premium",
  description: "Sistema de gestão de clientes de consórcio",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
