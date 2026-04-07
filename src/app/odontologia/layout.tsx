import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Dentista – Organize sua Agenda e Reduza Faltas | Synka",
  description:
    "O Synka organiza a agenda do seu consultório odontológico, elimina faltas com lembretes automáticos pelo WhatsApp e automatiza o agendamento de consultas. Foque nos seus pacientes.",
  openGraph: {
    title: "Synka para Dentistas – Agenda Automática e Menos Faltas",
    description:
      "Agendamento automático, lembretes de consulta e confirmação pelo WhatsApp. Seu consultório odontológico no piloto automático.",
    url: "https://synka.somar.ia.br/odontologia",
    siteName: "Synka",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synka para Dentistas",
    description: "Menos faltas. Mais consultas. Mais faturamento.",
  },
  alternates: { canonical: "https://synka.somar.ia.br/odontologia" },
};

export default function OdontologiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18061457090" strategy="afterInteractive" />
      <Script id="gtag-odontologia-base" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18061457090');`}
      </Script>
      <Script id="gtag-conversion-odontologia" strategy="afterInteractive">
        {`gtag('event','conversion',{'send_to':'AW-18061457090/xLcGCL6r4JccEMLtr6RD','transaction_id':''});`}
      </Script>
      {children}
    </>
  );
}
