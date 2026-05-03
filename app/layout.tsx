import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { BRANDING } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${BRANDING.agencyName} — Itinerary Builder`,
  description: `Internal itinerary builder for ${BRANDING.agencyName}.`,
  icons: { icon: BRANDING.logoPath },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
