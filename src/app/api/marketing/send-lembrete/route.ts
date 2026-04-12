import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { processarTemplate, TEMPLATE_LEMBRETE_PADRAO } from '@/lib/marketing-utils';

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { agendamentoId } = await req.json();
    if (!agendamentoId) return NextResponse.json({ error: 'agendamentoId obrigatório' }, { status: 400 });

    const [agendamento, config, clinica] = await Promise.all([
      prisma.agendamento.findFirst({
        where: { id: agendamentoId, tenantId },
        include: { paciente: true, servico: true, profissional: true },
      }),
      prisma.marketingConfig.findUnique({ where: { tenantId } }),
      prisma.clinica.findUnique({ where: { tenantId } }),
    ]);

    if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    if (!agendamento.paciente.telefone) return NextResponse.json({ error: 'Paciente sem telefone' }, { status: 422 });

    const dataHora = new Date(agendamento.dataHora);
    const template = config?.lembreteTemplate || TEMPLATE_LEMBRETE_PADRAO;
    const nomeClinica = config?.nomeClinica || clinica?.nome || 'Clínica';
    const profNome = agendamento.profissional?.nome;

    const mensagem = processarTemplate(template, {
      nome: agendamento.paciente.nome.split(' ')[0],
      data: dataHora.toLocaleDateString('pt-BR'),
      hora: dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      servico: agendamento.servico?.nome ?? 'Consulta',
      profissional: profNome ?? '',
      profissional_linha: profNome ? ` com ${profNome}` : '',
      clinica: nomeClinica,
      link: config?.linkConfirmacao ?? '',
    });

    const result = await sendAndLog({
      tenantId,
      tipo: 'lembrete',
      clienteNome: agendamento.paciente.nome,
      clienteTelefone: agendamento.paciente.telefone,
      mensagemEnviada: mensagem,
      forcarHorario: true,
      ignorarRisco: true,
    });

    // Marcar no banco apenas após confirmação real do envio
    if (result.success) {
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { lembreteEnviado: true },
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
