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
