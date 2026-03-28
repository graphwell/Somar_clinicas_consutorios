import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function validateN8nKey(request: Request) {
  const key = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return key === process.env.N8N_API_KEY;
}

export async function POST(request: Request) {
  if (!validateN8nKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId é obrigatório' }, { status: 400 });
  }

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { sessionId },
    select: { id: true, empresaId: true },
  });

  if (!instancia) {
    return NextResponse.json({ error: 'Instância não encontrada para este sessionId' }, { status: 404 });
  }

  await prisma.whatsappInstance.update({
    where: { sessionId },
    data: { status: 'OFFLINE', ultimoPing: new Date() },
  });

  // Criar notificação para a empresa caso esteja vinculada
  if (instancia.empresaId) {
    await prisma.notificacao.create({
      data: {
        tenantId: instancia.empresaId,
        titulo: 'WhatsApp desconectado',
        mensagem: 'Sua instância WhatsApp ficou offline. Acesse o painel para reconectar.',
      },
    });
  }

  return NextResponse.json({ success: true, mensagem: 'Instância marcada como offline' });
}
