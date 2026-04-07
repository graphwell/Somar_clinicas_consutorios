import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Clínica de Estética – Organize a Agenda e Fature Mais | Synka",
  description:
    "O Synka organiza a agenda da sua clínica de estética, elimina faltas com lembretes automáticos pelo WhatsApp e exibe seus procedimentos numa vitrine digital. Mais clientes, mais faturamento.",
  openGraph: {
    title: "Synka para Estética – Agenda Automática e Vitrine de Procedimentos",
    description:
      "Agendamento automático, lembretes que eliminam faltas e vitrine digital de procedimentos. Sua clínica de estética no próximo nível.",
    url: "https://synka.somar.ia.br/estetica",
    siteName: "Synka",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synka para Clínicas de Estética",
    description: "Menos faltas. Mais procedimentos. Mais faturamento.",
  },
  alternates: {
    canonical: "https://synka.somar.ia.br/estetica",
  },
};

export default function EsteticaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ── Google tag base ── */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090"
        strategy="afterInteractive"
      />
      <Script id="gtag-estetica-base" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18061457090');
        `}
      </Script>

      {/* ── Evento de conversão: Compra (dispara ao visitar a página) ── */}
      <Script id="gtag-conversion-estetica" strategy="afterInteractive">
        {`
          gtag('event', 'conversion', {
            'send_to': 'AW-18061457090/xLcGCL6r4JccEMLtr6RD',
            'transaction_id': ''
          });
        `}
      </Script>

      {children}
    </>
  );
}
