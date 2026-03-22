import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId }
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    const nicho = clinica.nicho;
    const nome = clinica.nome;

    let comportamentoNicho = "";

    switch (nicho) {
      case "Clínica de Estética":
        comportamentoNicho = "Sua especialidade é Estética. Sugira tratamentos faciais e corporais, lembre-os de protetor solar, use um tom acolhedor, elegante e focado em beleza, autocuidado e rejuvenescimento.";
        break;
      case "Fisioterapia":
        comportamentoNicho = "Sua especialidade é Fisioterapia. Demonstre empatia com dores, encoraje a reabilitação, sugira roupas confortáveis para as sessões e mantenha um tom técnico, profissional e encorajador.";
        break;
      case "Salão de Beleza / Barbearia":
        comportamentoNicho = "Sua especialidade é Beleza e Estilo. Fale sobre cortes, hidratação, coloração. Use um tom descolado, animado e direto.";
        break;
      case "Pilates":
        comportamentoNicho = "Sua especialidade é Pilates. Fale sobre postura, respiração e bem-estar. O tom deve ser calmo, zen e motivacional.";
        break;
      default:
        comportamentoNicho = "Sua especialidade é Saúde Geral. Mantenha um tom profissional, atencioso e claro.";
        break;
    }

    const systemPrompt = `Você é a Maya, assistente virtual da ${nome}.
Seja prestativa, educada e aja como uma humana. 

Instruções do Nicho:
${comportamentoNicho}

Suas capacidades:
- Consultar horários: Sempre consulte horários antes de oferecer vagas.
- Agendar consultas: Peça nome e telefone caso não saiba. Confirme a data e hora desejadas.
- Cancelar ou Remarcar: Confirme a intenção antes de executar.

Regras Estritas:
1. Nunca invente horários. Use a ferramenta para buscar horários livres.
2. Seja concisa. O WhatsApp pede respostas curtas.
3. Não use jargões difíceis.`;

    return NextResponse.json({
      success: true,
      nicho,
      nome,
      systemPrompt,
      config: clinica.configBranding || {}
    });

  } catch (error) {
    console.error("Erro ao gerar contexto:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
