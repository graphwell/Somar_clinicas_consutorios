import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { wasenderPost } from '@/lib/wasender';

function validateN8nKey(request: Request) {
  const key = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  return key === process.env.N8N_API_KEY;
}

/**
 * Proxy de envio de mensagens WhatsApp para o N8N.
 * O N8N nunca vê o bearerToken — ele informa sessionId + destinatário + mensagem,
 * e este endpoint busca o bearerToken internamente e chama o WasenderAPI.
 */
export async function POST(request: Request) {
  if (!validateN8nKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, to, message } = body;

  if (!sessionId || !to || !message) {
    return NextResponse.json({ error: 'sessionId, to e message são obrigatórios' }, { status: 400 });
  }

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { sessionId },
    select: { bearerToken: true, status: true },
  });

  if (!instancia) {
    return NextResponse.json({ error: 'Instância não encontrada para este sessionId' }, { status: 404 });
  }

  if (instancia.status === 'OFFLINE' || instancia.status === 'AGUARDANDO') {
    return NextResponse.json({ error: `Instância não está disponível (status: ${instancia.status})` }, { status: 503 });
  }

  const { ok, data } = await wasenderPost(instancia.bearerToken, '/messages/send', { to, message });

  if (!ok) {
    return NextResponse.json({ error: 'Falha ao enviar mensagem via WasenderAPI', detalhe: data }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
