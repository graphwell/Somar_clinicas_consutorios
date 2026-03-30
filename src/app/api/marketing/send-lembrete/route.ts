import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog, applyTemplate, DEFAULT_LEMBRETE_TEMPLATE } from '@/lib/marketing-helpers';

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { agendamentoId } = await req.json();
    if (!agendamentoId) return NextResponse.json({ error: 'agendamentoId obrigatório' }, { status: 400 });

    const [agendamento, config, clinica] = await Promise.all([
      prisma.agendamento.findFirst({
        where: { id: agendamentoId, tenantId },
        include: {
          paciente: true,
          servico: true,
          profissional: true,
        },
      }),
      prisma.marketingConfig.findUnique({ where: { tenantId } }),
      prisma.clinica.findUnique({ where: { tenantId } }),
    ]);

    if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    if (!agendamento.paciente.telefone) return NextResponse.json({ error: 'Paciente sem telefone cadastrado' }, { status: 422 });

    const dataHora = new Date(agendamento.dataHora);
    const template = config?.lembreteTemplate || DEFAULT_LEMBRETE_TEMPLATE;

    const mensagem = applyTemplate(template, {
      nome: agendamento.paciente.nome,
      data: dataHora.toLocaleDateString('pt-BR'),
      hora: dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      servico: agendamento.servico?.nome ?? 'Consulta',
      profissional: agendamento.profissional?.nome ?? '',
      clinica: clinica?.nome ?? 'Clínica',
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'lembrete',
      pacienteId: agendamento.pacienteId,
      pacienteNome: agendamento.paciente.nome,
      pacienteTelefone: agendamento.paciente.telefone,
      mensagem,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
