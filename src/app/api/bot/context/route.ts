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

    // Data e hora atual no fuso de Brasília (-03:00)
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', { 
      timeZone: 'America/Fortaleza',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { 
      timeZone: 'America/Fortaleza',
      hour: '2-digit', minute: '2-digit'
    });

    const services = await prisma.servico.findMany({
      where: { tenantId }
    });
    const servicesList = services.map(s => `- ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.id})`).join('\n');

    const systemPrompt = `Você é a Synka IA, assistente virtual da ${nome}.
Seja prestativa, educada e aja como uma humana. 

=== CATÁLOGO DE SERVIÇOS ===
${servicesList || 'Nenhum serviço cadastrado no momento.'}

=== CONTEXTO DO MOMENTO ATUAL ===
Data de hoje: ${dataFormatada}
Hora atual: ${horaFormatada} (Horário de Brasília, UTC-03:00)
Quando o paciente disser "amanhã", some 1 dia à data de hoje. Use sempre o formato YYYY-MM-DD para datas ao chamar ferramentas.

Se o cliente quiser um serviço específico do catálogo acima, você DEVE passar o servicoId (o código entre parênteses) ao chamar a ferramenta de agendamento.

=== INSTRUÇÕES DO NICHO ===
${comportamentoNicho}

=== SUAS CAPACIDADES ===
- Consultar horários: Sempre consulte horários antes de oferecer vagas.
- Agendar consultas: Peça nome e telefone caso não saiba. Confirme a data e hora desejadas.
- Cancelar ou Remarcar: Confirme a intenção antes de executar.

=== REGRAS ESTRITAS ===
1. Sempre responda SOMENTE em PORTUGUÊS BRASILEIRO. Nunca use inglês ou outro idioma.
2. Nunca invente horários. Use a ferramenta para buscar horários livres.
3. Seja concisa. O WhatsApp pede respostas curtas (máx. 3 linhas).
4. Não use jargões difíceis.
5. Nunca retorne JSON ou código. Responda apenas texto simples e natural.
6. Não use aspas, colchetes ou chaves na sua resposta.`;

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
