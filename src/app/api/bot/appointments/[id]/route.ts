import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateFinancialAndClientStats } from '@/lib/financial-automation';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { searchParams } = new URL(request.url);

  // Accept params from both query string (n8n tool placeholder) and body
  let body: any = {};
  try { body = await request.json(); } catch { /* body may be empty */ }

  const status = searchParams.get('status') || body.status;
  const dataHora = searchParams.get('dataHora') || body.dataHora;
  const tenantId = searchParams.get('tenantId') || body.tenantId;
  const servicoId = searchParams.get('servicoId') || body.servicoId;
  const profissionalId = searchParams.get('profissionalId') || body.profissionalId;

  try {
    const agendamentoAtual = await prisma.agendamento.findFirst({
      where: { id, tenantId }
    });

    if (!agendamentoAtual) {
      return NextResponse.json({ error: 'Agendamento não encontrado ou não pertence a esta clínica' }, { status: 404 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (servicoId) data.servicoId = servicoId;
    if (profissionalId) data.profissionalId = profissionalId;

    // Se for remarcação (mudança de horário), precisa checar conflito novamente
    if (dataHora) {
      const newDate = new Date(dataHora);
      data.dataHora = newDate;
      data.status = 'pendente'; // Remarcação entra como pendente para confirmação dupla (Módulo 3.3/3.4)
      
      const conflictWhere: any = { dataHora: newDate, tenantId, status: { in: ['confirmado', 'pendente'] }, id: { not: id } };
      const currentPrf = profissionalId || agendamentoAtual.profissionalId;
      if (currentPrf) conflictWhere.profissionalId = currentPrf;

      const conflict = await prisma.agendamento.findFirst({
        where: conflictWhere
      });

      if (conflict) {
        // Registro de conflito para o atendente
        await prisma.notificacao.create({
          data: {
            tenantId,
            titulo: '⚠️ Conflito na Remarcação',
            mensagem: `Tentativa de remarcação conflitante detectada. O horário ${newDate.toLocaleString()} já está ocupado.`
          }
        });
        return NextResponse.json({ success: false, error: 'O novo horário escolhido já está ocupado' }, { status: 409 });
      }
    }

    if (Object.keys(data).length > 0) {
      // @ts-ignore
      const updated = await prisma.agendamento.update({
        where: { id },
        data
      });

      // V2: Automação Financeira & Estatísticas
      if (status || dataHora) {
        await updateFinancialAndClientStats(id, tenantId, status || 'remarcado');
      }

      return NextResponse.json({ success: true, message: 'Agendamento atualizado com sucesso', agendamento: updated });
    }

    return NextResponse.json({ error: 'Nenhuma ação válida fornecida' }, { status: 400 });

  } catch (error) {
    console.error("Erro no PUT /api/bot/appointments/:id", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
