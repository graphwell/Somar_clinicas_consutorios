import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Barbearia – Organize, Reduza Faltas e Aumente o Faturamento | Synka",
  description:
    "O Synka transforma sua barbearia com agendamento automático pelo WhatsApp, lembretes que eliminam faltas e uma vitrine digital dos seus serviços. Menos estresse, mais faturamento.",
  openGraph: {
    title: "Synka para Barbearias – Agende, Reduza Faltas e Venda Mais",
    description:
      "Agendamento automático, lembretes pelo WhatsApp e vitrine de serviços. Sua barbearia faturando mais sem esforço.",
    url: "https://synka.somar.ia.br/barbearia",
    siteName: "Synka",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synka para Barbearias",
    description: "Menos faltas. Mais clientes. Mais faturamento.",
  },
  alternates: {
    canonical: "https://synka.somar.ia.br/barbearia",
  },
};

export default function BarbeariaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ── Google tag base (reforço local para garantir carregamento) ── */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090"
        strategy="afterInteractive"
      />
      <Script id="gtag-barbearia-base" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18061457090');
        `}
      </Script>

      {/* ── Evento de conversão: Compra (dispara ao visitar a página) ── */}
      <Script id="gtag-conversion-barbearia" strategy="afterInteractive">
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

