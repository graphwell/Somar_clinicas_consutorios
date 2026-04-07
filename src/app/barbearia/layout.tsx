import type { Metadata } from "next";

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
  return <>{children}</>;
}
