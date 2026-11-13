import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.URL || process.env.APP_URL || "http://localhost:3000"),
  title: { default: "Nautica Growth Engine", template: "%s · Nautica Growth Engine" },
  description: "Produzione di campagne e lead per Faieta Marine",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0C1A30" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
