import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey } from '@/lib/n8n-auth';

export async function GET(request: Request) {
  if (!autenticarApiKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const whatsapp = searchParams.get('whatsapp');
  const tenantId = searchParams.get('tenantId') || searchParams.get('empresa_id');

  if (!whatsapp || !tenantId) {
    return NextResponse.json({ error: 'whatsapp e tenantId são obrigatórios' }, { status: 400 });
  }

  // Limpar o número para busca — gera variantes para cobrir diferentes formatos salvos
  const cleanNumber = whatsapp.replace(/\D/g, '');
  const sufixo9 = cleanNumber.slice(-9);  // últimos 9 dígitos (com nono dígito)
  const sufixo8 = cleanNumber.slice(-8);  // últimos 8 dígitos

  try {
    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        OR: [
          { telefone: cleanNumber },
          { telefone: whatsapp },
          { telefone: { endsWith: sufixo9 } },
          { telefone: { endsWith: sufixo8 } },
        ]
      },
      include: {
        assinaturas: { where: { status: 'ativo' }, take: 1 },
        agendamentos: {
          where: { status: { in: ['confirmado', 'done'] as any[] } },
          orderBy: { dataHora: 'desc' },
          take: 5,
          include: {
            profissional: { select: { id: true, nome: true } },
            servico: { select: { id: true, nome: true } },
          }
        }
      }
    });

    if (!paciente) {
      return NextResponse.json({ success: true, cadastrado: false });
    }

    // Identificar profissional preferido baseados no histórico recente
    const proHist = paciente.agendamentos
      .filter(a => a.profissionalId)
      .map(a => a.profissional);
    
    // Contagem de frequência por profissional
    const counts = new Map<string, { id: string, nome: string, count: number }>();
    proHist.forEach(p => {
      if (p) {
        const v = counts.get(p.id) || { id: p.id, nome: p.nome, count: 0 };
        v.count++;
        counts.set(p.id, v);
      }
    });

    const favPro = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0] || null;

    const ultimoAgendamento = paciente.agendamentos[0] ?? null;
    const resumoBot = paciente.agendamentos.length > 0
      ? `Paciente conhecido: ${paciente.nome}. Último atendimento: ${ultimoAgendamento?.servico?.nome ?? 'N/A'} com ${ultimoAgendamento?.profissional?.nome ?? 'N/A'} em ${ultimoAgendamento?.dataHora ? new Date(ultimoAgendamento.dataHora).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }) : 'N/A'}.`
      : `Paciente conhecido: ${paciente.nome}. Sem histórico de atendimentos.`;

    return NextResponse.json({
      success: true,
      cadastrado: true,
      id: paciente.id,
      nome: paciente.nome,
      cpf: paciente.cpf,
      assinante: paciente.assinaturas.length > 0,
      profissionalPreferido: favPro ? { id: favPro.id, nome: favPro.nome } : null,
      ultimoServico: ultimoAgendamento?.servico
        ? { servicoId: ultimoAgendamento.servico.id, nome: ultimoAgendamento.servico.nome }
        : null,
      ultimoProfissional: ultimoAgendamento?.profissional
        ? { profissionalId: ultimoAgendamento.profissional.id, nome: ultimoAgendamento.profissional.nome }
        : null,
      historico_recente: paciente.agendamentos.map(a => ({
        data: a.dataHora,
        servico: a.servico?.nome ?? a.categoria,
        servicoId: a.servico?.id ?? null,
        profissional: a.profissional?.nome ?? null,
        profissionalId: a.profissional?.id ?? null,
      })),
      resumoBot,
    });

  } catch (error) {
    console.error('Erro ao buscar info do cliente n8n:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
