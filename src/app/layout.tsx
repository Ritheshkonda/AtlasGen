import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AtlasGen", description: "Validated AI application generation pipeline" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
