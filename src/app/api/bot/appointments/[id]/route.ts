import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
      data.status = 'remarcado';
      
      const conflictWhere: any = { dataHora: newDate, tenantId, status: { not: 'cancelado' }, id: { not: id } };
      const currentPrf = profissionalId || agendamentoAtual.profissionalId;
      if (currentPrf) conflictWhere.profissionalId = currentPrf;

      const conflict = await prisma.agendamento.findFirst({
        where: conflictWhere
      });

      if (conflict) {
        return NextResponse.json({ success: false, error: 'O novo horário escolhido já está ocupado' }, { status: 409 });
      }
    }

    if (Object.keys(data).length > 0) {
      // @ts-ignore
      const updated = await prisma.agendamento.update({
        where: { id },
        data
      });
      return NextResponse.json({ success: true, message: 'Agendamento atualizado com sucesso', agendamento: updated });
    }

    return NextResponse.json({ error: 'Nenhuma ação válida fornecida' }, { status: 400 });

  } catch (error) {
    console.error("Erro no PUT /api/bot/appointments/:id", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
