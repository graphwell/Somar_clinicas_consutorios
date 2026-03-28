import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    console.error('[API BOT CONTEXT] Falta tenantId na requisição');
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  console.log(`[API BOT CONTEXT] Buscando contexto para tenantId: ${tenantId}`);

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId }
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    const nicho = clinica.nicho;
    const nome = clinica.nome;

    // Linguagem e palavras proibidas por nicho
    type NichoPromptConfig = {
      termoAtendimento: string;
      termoPaciente: string;
      termoProfissional: string;
      tratamento: string;
      comportamento: string;
      palavrasProibidas: string[];
    };

    const NICHO_PROMPTS: Record<string, NichoPromptConfig> = {
      CLINICA_MEDICA: {
        termoAtendimento: 'consulta',
        termoPaciente: 'paciente',
        termoProfissional: 'médico',
        tratamento: 'Dr./Dra.',
        comportamento: 'Você é a atendente virtual de uma clínica médica. Mantenha tom profissional, acolhedor e focado na saúde. Use sempre "consulta", "paciente", "médico", "Dr./Dra.". Demonstre empatia com queixas de saúde.',
        palavrasProibidas: ['cliente', 'serviço', 'corte', 'beleza']
      },
      CLINICA_MULTI: {
        termoAtendimento: 'consulta',
        termoPaciente: 'paciente',
        termoProfissional: 'especialista',
        tratamento: 'Dr./Dra.',
        comportamento: 'Você é a atendente virtual de uma clínica com múltiplas especialidades. Use sempre "consulta", "paciente", "especialista", "Dr./Dra.". Quando o paciente não souber qual especialidade, ajude a identificar a mais adequada.',
        palavrasProibidas: ['cliente', 'serviço', 'corte', 'beleza']
      },
      ODONTOLOGIA: {
        termoAtendimento: 'atendimento',
        termoPaciente: 'paciente',
        termoProfissional: 'dentista',
        tratamento: 'Dr./Dra.',
        comportamento: 'Você é a atendente virtual de um consultório odontológico. Use sempre "atendimento", "paciente", "dentista", "Dr./Dra.". Seja tranquilizador — muitos pacientes têm ansiedade com dentistas. Nunca use "consulta médica" ou termos médicos gerais.',
        palavrasProibidas: ['cliente', 'serviço', 'corte', 'médico', 'prontuário médico']
      },
      FISIOTERAPIA: {
        termoAtendimento: 'sessão',
        termoPaciente: 'paciente',
        termoProfissional: 'fisioterapeuta',
        tratamento: '',
        comportamento: 'Você é a atendente virtual de uma clínica de fisioterapia. Use sempre "sessão", "paciente", "fisioterapeuta". Demonstre empatia com dores e lesões. Encoraje a reabilitação. Sugira roupas confortáveis para as sessões.',
        palavrasProibidas: ['cliente', 'corte', 'beleza', 'médico']
      },
      NUTRICAO: {
        termoAtendimento: 'consulta',
        termoPaciente: 'paciente',
        termoProfissional: 'nutricionista',
        tratamento: '',
        comportamento: 'Você é a atendente virtual de um consultório de nutrição. Use sempre "consulta", "paciente", "nutricionista". Seja encorajador com objetivos de saúde. Não use "médico" ou "diagnóstico clínico" — apenas orientações nutricionais.',
        palavrasProibidas: ['cliente', 'corte', 'beleza', 'médico', 'diagnóstico']
      },
      CLINICA_ESTETICA: {
        termoAtendimento: 'procedimento',
        termoPaciente: 'cliente',
        termoProfissional: 'esteticista',
        tratamento: '',
        comportamento: 'Você é a atendente virtual de uma clínica estética. Use sempre "procedimento", "cliente", "esteticista". Tom acolhedor, elegante e focado em beleza e autocuidado. Sugira protetor solar. Nunca use "consulta médica", "paciente" ou "médico".',
        palavrasProibidas: ['paciente', 'médico', 'consulta médica', 'prontuário', 'Dr.', 'Dra.']
      },
      SALAO_BELEZA: {
        termoAtendimento: 'serviço',
        termoPaciente: 'cliente',
        termoProfissional: 'profissional',
        tratamento: '',
        comportamento: 'Você é a atendente virtual de um salão de beleza. Use sempre "serviço", "cliente", nome do profissional diretamente. Tom descolado, animado e direto. Fale sobre cortes, coloração, hidratação. NUNCA use "paciente", "consulta", "médico", "prontuário", "Dr." ou "Dra.".',
        palavrasProibidas: ['paciente', 'médico', 'consulta', 'prontuário', 'Dr.', 'Dra.', 'clínica médica']
      },
      BARBEARIA: {
        termoAtendimento: 'serviço',
        termoPaciente: 'cliente',
        termoProfissional: 'barbeiro',
        tratamento: '',
        comportamento: 'Você é a atendente virtual de uma barbearia. Use sempre "serviço", "cliente", "barbeiro" ou nome do barbeiro diretamente. Tom descontraído, direto e amigável. NUNCA use "paciente", "consulta", "médico", "prontuário", "Dr." ou "Dra.".',
        palavrasProibidas: ['paciente', 'médico', 'consulta', 'prontuário', 'Dr.', 'Dra.', 'clínica médica']
      }
    };

    const cfg = NICHO_PROMPTS[nicho] || {
      termoAtendimento: 'serviço',
      termoPaciente: 'cliente',
      termoProfissional: 'profissional',
      tratamento: '',
      comportamento: 'Mantenha tom profissional, atencioso e claro.',
      palavrasProibidas: []
    };

    const proibidas = cfg.palavrasProibidas.length > 0
      ? `\nPALAVRAS PROIBIDAS — nunca use: ${cfg.palavrasProibidas.map(p => `"${p}"`).join(', ')}.`
      : '';

    const comportamentoNicho = `${cfg.comportamento}${proibidas}
Ao falar de atendimentos use sempre "${cfg.termoAtendimento}".
Ao falar de quem atende use sempre "${cfg.termoProfissional}"${cfg.tratamento ? ` com tratamento ${cfg.tratamento}` : ''}.
Ao falar do cliente/paciente use sempre "${cfg.termoPaciente}".`;

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

    // Buscar sessionId da instância WhatsApp ativa desta empresa
    const waInstance = await prisma.whatsappInstance.findFirst({
      where: { empresaId: tenantId, status: 'EM_USO' },
      select: { sessionId: true },
    });

    return NextResponse.json({
      success: true,
      nicho,
      nome,
      systemPrompt,
      whatsappSessionId: waInstance?.sessionId ?? null,
      config: clinica.configBranding || {}
    });

  } catch (error) {
    console.error("Erro ao gerar contexto:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
