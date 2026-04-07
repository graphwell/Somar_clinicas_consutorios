import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Salão de Beleza – Organize a Agenda e Fature Mais | Synka",
  description:
    "O Synka organiza a agenda do seu salão de beleza, elimina faltas com lembretes automáticos pelo WhatsApp e exibe seus serviços numa vitrine digital. Mais clientes, mais faturamento.",
  openGraph: {
    title: "Synka para Salões – Agenda Automática e Vitrine de Serviços",
    description:
      "Agendamento pelo WhatsApp, lembretes automáticos e vitrine de serviços. Seu salão no próximo nível.",
    url: "https://synka.somar.ia.br/salao",
    siteName: "Synka",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synka para Salões de Beleza",
    description: "Menos faltas. Mais clientes. Mais faturamento.",
  },
  alternates: { canonical: "https://synka.somar.ia.br/salao" },
};

export default function SalaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090" strategy="afterInteractive" />
      <Script id="gtag-salao-base" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18061457090');`}
      </Script>
      <Script id="gtag-conversion-salao" strategy="afterInteractive">
        {`gtag('event','conversion',{'send_to':'AW-18061457090/xLcGCL6r4JccEMLtr6RD','transaction_id':''});`}
      </Script>
      {children}
    </>
  );
}
