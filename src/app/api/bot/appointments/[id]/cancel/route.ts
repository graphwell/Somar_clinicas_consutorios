import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/bot/appointments/[id]/cancel
 * Cancela um agendamento. Usado pelo tool_cancel do N8N/IA.
 * Parâmetros: tenantId (body ou query), motivo (opcional)
 */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { searchParams } = new URL(request.url);

  let body: any = {};
  try { body = await request.json(); } catch {}

  const tenantId = body.tenantId || searchParams.get('tenantId');
  const motivo = body.motivo || searchParams.get('motivo') || 'Cancelado pelo cliente via WhatsApp';

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  try {
    const agendamento = await prisma.agendamento.findFirst({
      where: { id, tenantId },
      include: { paciente: true, servico: true }
    });

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    if (agendamento.status === 'cancelado') {
      return NextResponse.json({ success: true, message: 'Agendamento já estava cancelado', agendamento });
    }

    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        status: 'cancelado',
        observacoes: agendamento.observacoes
          ? `${agendamento.observacoes} | Cancelado: ${motivo}`
          : `Cancelado: ${motivo}`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      agendamento: updated
    });

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    return NextResponse.json({ error: 'Erro interno ao cancelar' }, { status: 500 });
  }
}
