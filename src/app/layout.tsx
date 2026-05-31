import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtlasGen - AI Application Generator",
  description: "Production-grade multi-stage generation resolving natural language prompts into validated DataSchemas and AppSpecs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased">
        {children}
      </body>
    </html>
  );
}
