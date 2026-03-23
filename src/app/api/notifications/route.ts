import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper temporary (in production use session token)
const TENANT_ID = 'clinica_id_default';

export async function GET(request: Request) {
  try {
    const notificacoes = await prisma.notificacao.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    const unreadCount = await prisma.notificacao.count({
      where: { tenantId: TENANT_ID, lida: false }
    });

    return NextResponse.json({ notificacoes, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { titulo, mensagem, tenantId } = body;

  try {
    const nova = await prisma.notificacao.create({
      data: {
        titulo,
        mensagem,
        tenantId: tenantId || TENANT_ID
      }
    });
    return NextResponse.json(nova);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar notificação' }, { status: 500 });
  }
}
