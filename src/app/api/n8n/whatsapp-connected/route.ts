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
  const { sessionId, numeroWa } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId é obrigatório' }, { status: 400 });
  }

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { sessionId },
    select: { id: true, status: true },
  });

  if (!instancia) {
    return NextResponse.json({ error: 'Instância não encontrada para este sessionId' }, { status: 404 });
  }

  await prisma.whatsappInstance.update({
    where: { sessionId },
    data: {
      status: 'EM_USO',
      numeroWa: numeroWa ?? null,
      conectadoEm: new Date(),
      ultimoPing: new Date(),
    },
  });

  return NextResponse.json({ success: true, mensagem: 'Instância marcada como conectada' });
}
