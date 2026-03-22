import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const body = await request.json();
  const { status, dataHora, tenantId } = body;

  try {
    const agendamentoAtual = await prisma.agendamento.findFirst({
      where: { id, tenantId }
    });

    if (!agendamentoAtual) {
      return NextResponse.json({ error: 'Agendamento não encontrado ou não pertence a esta clínica' }, { status: 404 });
    }

    // Se for remarcação, precisa checar conflito novamente
    if (dataHora) {
      const newDate = new Date(dataHora);
      const conflict = await prisma.agendamento.findFirst({
        where: { dataHora: newDate, tenantId, status: { not: 'cancelado' } }
      });

      if (conflict) {
        return NextResponse.json({ success: false, error: 'O novo horário escolhido já está ocupado' }, { status: 409 });
      }

      await prisma.agendamento.update({
        where: { id },
        data: { dataHora: newDate, status: 'remarcado' }
      });

      return NextResponse.json({ success: true, message: 'Remarcato com sucesso' });
    }

    // Apenas mudança de status (ex: Cancelado, Confirmado)
    if (status) {
      await prisma.agendamento.update({
        where: { id },
        data: { status }
      });
      return NextResponse.json({ success: true, message: `Status alterado para ${status}` });
    }

    return NextResponse.json({ error: 'Nenhuma ação válida fornecida' }, { status: 400 });

  } catch (error) {
    console.error("Erro no PUT /api/appointments/:id", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
