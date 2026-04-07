import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Nutricionista – Organize sua Agenda e Reduza Faltas | Synka",
  description:
    "O Synka organiza a agenda da sua clínica de nutrição, elimina faltas com lembretes automáticos pelo WhatsApp e automatiza o agendamento de consultas. Foque nos seus pacientes.",
  openGraph: {
    title: "Synka para Nutricionistas – Agenda Automática e Menos Faltas",
    description:
      "Agendamento automático, lembretes de consulta e confirmação pelo WhatsApp. Sua clínica de nutrição no piloto automático.",
    url: "https://synka.somar.ia.br/nutricao",
    siteName: "Synka",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synka para Nutricionistas",
    description: "Menos faltas. Mais consultas. Mais faturamento.",
  },
  alternates: { canonical: "https://synka.somar.ia.br/nutricao" },
};

export default function NutricaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090" strategy="afterInteractive" />
      <Script id="gtag-nutricao-base" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18061457090');`}
      </Script>
      <Script id="gtag-conversion-nutricao" strategy="afterInteractive">
        {`gtag('event','conversion',{'send_to':'AW-18061457090/xLcGCL6r4JccEMLtr6RD','transaction_id':''});`}
      </Script>
      {children}
    </>
  );
}
