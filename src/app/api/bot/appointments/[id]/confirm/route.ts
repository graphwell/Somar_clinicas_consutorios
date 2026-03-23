import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Módulo 4: Endpoint específico para confirmação via N8N
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { searchParams } = new URL(request.url);

  let body: any = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const tenantId = searchParams.get('tenantId') || body.tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  try {
    const agendamento = await prisma.agendamento.findFirst({
      where: { id, tenantId }
    });

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    if (agendamento.status === 'cancelado') {
      return NextResponse.json({ error: 'Agendamento já foi cancelado' }, { status: 400 });
    }

    await prisma.agendamento.update({
      where: { id },
      data: { status: 'confirmado' }
    });

    return NextResponse.json({ success: true, message: 'Agendamento confirmado com sucesso' });
  } catch (error) {
    console.error('Erro ao confirmar agendamento', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
