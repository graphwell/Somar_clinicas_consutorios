import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, wasenderGet, INSTANCE_SELECT } from '@/lib/wasender';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, bearerToken: true, sessionId: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  const { ok, data } = await wasenderGet(instancia.bearerToken, '/session/status');

  await prisma.whatsappInstance.update({
    where: { id: params.id },
    data: { ultimoPing: new Date() },
  });

  return NextResponse.json({
    success: true,
    conectado: ok ? (data.connected ?? data.status === 'connected') : false,
    numero: data.number ?? data.phoneNumber ?? null,
    statusWasender: data.status ?? null,
  });
}
