import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { NichoType } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numero_wa = searchParams.get('numero_wa');
  const session_id = searchParams.get('session_id');

  if (!numero_wa && !session_id) {
    return NextResponse.json({ error: 'Informe numero_wa ou session_id' }, { status: 400 });
  }

  try {
    let clinica: any = null;
    let whatsappSessionId: string | null = null;

    // ── Caminho 1: session_id (roteamento principal do N8N via WasenderAPI) ──
    if (session_id) {
      const instancia = await prisma.whatsappInstance.findUnique({
        where: { sessionId: session_id },
        select: { empresaId: true, sessionId: true },
      });

      if (!instancia?.empresaId) {
        return NextResponse.json({ error: 'Nenhuma empresa vinculada a este sessionId' }, { status: 404 });
      }

      whatsappSessionId = instancia.sessionId;

      clinica = await prisma.clinica.findUnique({
        where: { tenantId: instancia.empresaId },
        include: {
          servicos: { where: { ativo: true } },
          profissionais: { where: { ativo: true } },
          convenios: { where: { ativo: true } },
        },
      });
    }

    // ── Caminho 2: numero_wa (legado — busca por adminPhone ou ClinicIntegration) ──
    if (!clinica && numero_wa) {
      const cleanNumber = numero_wa.replace(/\D/g, '');

      clinica = await prisma.clinica.findFirst({
        where: {
          OR: [
            { adminPhone: cleanNumber },
            { adminPhone: numero_wa },
            { integracoes: { some: { type: 'whatsapp', config: { path: ['number'], equals: cleanNumber } } } },
            { integracoes: { some: { type: 'whatsapp', config: { path: ['number'], equals: numero_wa } } } },
          ],
        },
        include: {
          servicos: { where: { ativo: true } },
          profissionais: { where: { ativo: true } },
          convenios: { where: { ativo: true } },
          integracoes: { where: { type: 'whatsapp' } },
        },
      });

      // Fallback: filtrar no código se o DB não suportar query JSON
      if (!clinica) {
        const allWa = await prisma.clinicIntegration.findMany({
          where: { type: 'whatsapp' },
          include: {
            clinica: {
              include: {
                servicos: { where: { ativo: true } },
                profissionais: { where: { ativo: true } },
                convenios: { where: { ativo: true } },
              },
            },
          },
        });
        const found = allWa.find(i => {
          const cfg = i.config as any;
          return cfg?.number === cleanNumber || cfg?.number === numero_wa;
        });
        if (found) clinica = found.clinica;
      }

      // Tentar resolver o sessionId para esta empresa (para que o N8N saiba qual instância usar)
      if (clinica) {
        const inst = await prisma.whatsappInstance.findFirst({
          where: { empresaId: clinica.tenantId, status: 'EM_USO' },
          select: { sessionId: true },
        });
        whatsappSessionId = inst?.sessionId ?? null;
      }
    }

    if (!clinica) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // ── Montagem da resposta ──
    const profissionais = clinica.profissionais.map((p: any) => ({
      id: p.id, nome: p.nome, especialidade: p.especialidade,
    }));
    const servicos = clinica.servicos.map((s: any) => ({
      id: s.id, nome: s.nome, preco: s.preco, duracao: s.duracaoMinutos,
    }));
    const convenios = clinica.convenios.map((c: any) => c.nomeConvenio);

    let termoCliente = 'cliente';
    let termoServico = 'serviço';
    switch (clinica.nicho) {
      case NichoType.CLINICA_ESTETICA:
        termoCliente = 'paciente'; termoServico = 'procedimento'; break;
      case NichoType.FISIOTERAPIA:
        termoCliente = 'paciente'; termoServico = 'sessão'; break;
      case NichoType.SALAO_BELEZA:
      case NichoType.BARBEARIA:
        termoCliente = 'cliente'; termoServico = 'serviço'; break;
      case NichoType.CLINICA_MEDICA:
      case NichoType.ODONTOLOGIA:
      case NichoType.CLINICA_MULTI:
        termoCliente = 'paciente'; termoServico = 'consulta'; break;
    }

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit',
    });

    const temEspecialidades = [NichoType.CLINICA_MEDICA, NichoType.CLINICA_MULTI].includes(clinica.nicho);
    const isSalao = [NichoType.SALAO_BELEZA, NichoType.BARBEARIA, NichoType.CLINICA_ESTETICA].includes(clinica.nicho);
    const temConvenio = [NichoType.CLINICA_MEDICA, NichoType.CLINICA_MULTI, NichoType.ODONTOLOGIA].includes(clinica.nicho);

    const tomDeVoz = temEspecialidades || clinica.nicho === NichoType.FISIOTERAPIA || clinica.nicho === NichoType.ODONTOLOGIA
      ? 'Formal e profissional. Use "Sr./Sra." e chame o cliente de "paciente".'
      : isSalao
        ? 'Descontraído e animado. Use o nome do cliente e "você".'
        : 'Acolhedor e profissional. Use o nome do cliente.';

    const fluxoPrincipal = temEspecialidades ? `
FLUXO: CLÍNICA MULTI-ESPECIALIDADES
Passo 1 — Especialidade: Chame tool_list (tipo="especialidades") e liste as opções disponíveis (máx. 5). Pergunta: "Qual especialidade você precisa?"
Passo 2 — Profissional: Use tool_list_by_service com o id do serviço. Se houver apenas 1, informe e pule. Se cliente já foi atendido (tool_client_info), sugira o preferido dele.
Passo 3 — Tipo de consulta: Liste os tipos (consulta inicial, retorno, etc.). Se houver apenas 1 tipo, pule.
Passo 4 — Data: "Qual data você prefere?"
Passo 5 — Horário: Chame tool_availability. Mostre até 5 opções. Se não houver, informe próximas datas.
Passo 6 — Convênio: "Será por convênio ou particular?" Se convênio, verifique contra a lista de convênios.
Passo 7 — Dados (só clientes novos): Nome Completo → CPF (UM por mensagem).
Passo 8 — Confirmação: Resumo completo. "Confirma? Responda SIM ou NÃO."` : isSalao ? `
FLUXO: SALÃO / BARBEARIA / ESTÉTICA
Passo 1 — Serviço: Chame tool_list (tipo="servicos") e liste com preços (máx. 5). Se houver combo, ofereça UMA vez.
Passo 1a — Assinante: Chame tool_client_info. Se tiver plano ativo, informe que está incluso.
Passo 2 — Profissional: Chame tool_list_by_service. Se cliente tiver histórico, sugira o preferido primeiro.
Passo 3 — Data: "Qual data você prefere?"
Passo 4 — Horário: Chame tool_availability. Mostre até 5 opções.
Passo 5 — Confirmação: Resumo completo. "Confirma? Responda SIM ou NÃO."` : `
FLUXO: CLÍNICA MONO-ESPECIALIDADE
Passo 1 — Serviço: Chame tool_list (tipo="servicos") e liste as opções (máx. 5).
Passo 2 — Profissional: Chame tool_list_by_service. Se apenas 1, informe e pule.
Passo 3 — Data: "Qual data você prefere?"
Passo 4 — Horário: Chame tool_availability. Mostre até 5 opções.
Passo 5 — Dados (só clientes novos via tool_client_info): Nome Completo → CPF (UM por mensagem).
Passo 6 — Confirmação: Resumo completo. "Confirma? Responda SIM ou NÃO."`;

    const instrucoes_ia = `Você é a Maya, atendente virtual da ${clinica.nome}.
Conduza o agendamento como um atendente humano experiente: passo a passo, sem pressa, sem pular etapas.

=== PRINCÍPIO FUNDAMENTAL ===
UMA pergunta por mensagem. Nunca faça duas perguntas ao mesmo tempo.

=== TOM DE VOZ ===
${tomDeVoz}

${fluxoPrincipal}

=== REGRAS GERAIS (ZERO TOLERÂNCIA) ===
1. Sempre listar opções ao perguntar — nunca diga "qual serviço?" sem mostrar a lista.
2. Máximo 5 itens por lista. Se houver mais, mostre os principais e diga "e outras opções disponíveis."
3. Nunca presuma o profissional. Se o cliente não escolheu, pergunte sempre.
4. PROIBIDO chamar tool_book antes do cliente dizer "SIM" na confirmação. Sem exceção.
5. Após o SIM: chame tool_book em silêncio. Se sucesso, confirme e deseje um bom dia.
6. NUNCA mencione nomes de ferramentas ou envie JSON para o cliente.
7. Se usar uma ferramenta, nunca descreva o processo. Mostre apenas o resultado em texto natural.
8. Data de hoje: ${dataFormatada}. Hora atual: ${horaFormatada}. Datas em formato YYYY-MM-DD ao chamar ferramentas.${temConvenio ? '\n9. Convênio não aceito: "No momento não atendemos esse convênio. Gostaria de agendar como particular?"' : ''}`;

    return NextResponse.json({
      empresa_id: clinica.tenantId,
      nome_empresa: clinica.nome,
      nicho: clinica.nicho.toLowerCase(),
      whatsapp_session_id: whatsappSessionId,
      termo_cliente: termoCliente,
      termo_servico: termoServico,
      profissionais,
      servicos,
      horarios: {
        abertura: clinica.openingTime,
        fechamento: clinica.closingTime,
        dias_uteis: clinica.workingDays,
      },
      convenios,
      mensagem_boas_vindas: `Olá! Sou a assistente virtual da ${clinica.nome}. Como posso ajudar você hoje?`,
      instrucoes_ia,
    });

  } catch (error) {
    console.error('Erro na identificação da empresa via WA:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
