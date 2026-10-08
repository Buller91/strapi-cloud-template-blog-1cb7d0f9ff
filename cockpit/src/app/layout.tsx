import "@fontsource-variable/archivo";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Cybershark Cockpit",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
