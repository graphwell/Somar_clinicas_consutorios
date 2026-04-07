import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Psicólogo – Organize sua Agenda e Reduza Faltas | Synka",
  description:
    "O Synka organiza a agenda do seu consultório de psicologia, elimina faltas com lembretes automáticos pelo WhatsApp e automatiza o agendamento de sessões. Foque nos seus pacientes.",
  openGraph: {
    title: "Synka para Psicólogos – Agenda Automática e Menos Faltas",
    description:
      "Agendamento automático, lembretes de sessão e confirmação pelo WhatsApp. Seu consultório organizado sem esforço.",
    url: "https://synka.somar.ia.br/psicologia",
    siteName: "Synka",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synka para Psicólogos",
    description: "Menos faltas. Mais sessões. Mais faturamento.",
  },
  alternates: { canonical: "https://synka.somar.ia.br/psicologia" },
};

export default function PsicologiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090" strategy="afterInteractive" />
      <Script id="gtag-psicologia-base" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18061457090');`}
      </Script>
      <Script id="gtag-conversion-psicologia" strategy="afterInteractive">
        {`gtag('event','conversion',{'send_to':'AW-18061457090/xLcGCL6r4JccEMLtr6RD','transaction_id':''});`}
      </Script>
      {children}
    </>
  );
}
