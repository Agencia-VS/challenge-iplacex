import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BRAND, PALETTE } from "@/lib/brand";
import { CondicionAcademicaGate } from "@/components/auth/condicion-academica-gate";

// Tipografía institucional para toda la interfaz. El logo usa arte original.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.fullName,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  metadataBase: new URL(BRAND.url),
  openGraph: {
    title: BRAND.fullName,
    description: BRAND.ogDescription,
    locale: BRAND.locale,
    type: "website",
  },
};

// El color del chrome del navegador acompaña al fondo del sitio.
export const viewport: Viewport = {
  themeColor: PALETTE.surface,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${montserrat.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <CondicionAcademicaGate />
      </body>
    </html>
  );
}
