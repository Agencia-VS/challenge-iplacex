import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BRAND, PALETTE } from "@/lib/brand";

// Montserrat es el sustituto más cercano al wordmark del logotipo: geométrica,
// de caja alta ancha y remates rectos.
const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const interBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jetBrains = JetBrains_Mono({
  variable: "--font-mono",
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
        className={`${inter.variable} ${montserrat.variable} ${interBody.variable} ${jetBrains.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
