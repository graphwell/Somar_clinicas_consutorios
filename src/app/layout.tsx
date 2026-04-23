import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import PWARegister from "@/components/PWARegister";
import Script from "next/script";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Synka — Agendamento Inteligente para Clínicas",
  description:
    "Synka é a plataforma de agendamento automático com IA nativa no WhatsApp, desenvolvida pela Somar. Escalone o atendimento da sua clínica em piloto automático.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Synka — Agendamento Inteligente para Clínicas",
    description:
      "Automatize agendamentos, lembretes e atendimento pelo WhatsApp com IA. Ativo em menos de 24h para clínicas, consultórios e salões.",
    url: "https://synka.somar.ia.br",
    siteName: "Synka",
    images: [
      {
        url: "https://synka.somar.ia.br/synka-logo-quadrada.png",
        width: 512,
        height: 512,
        alt: "Synka — Agendamento Inteligente para Clínicas",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Synka — Agendamento Inteligente para Clínicas",
    description:
      "Automatize agendamentos, lembretes e atendimento pelo WhatsApp com IA.",
    images: ["https://synka.somar.ia.br/synka-logo-quadrada.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ── Google Ads / GA4 tag ── */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18061457090');
          `}
        </Script>
        <ThemeProvider>
          <PWARegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
