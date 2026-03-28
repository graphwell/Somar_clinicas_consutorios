import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, wasenderGet } from '@/lib/wasender';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, bearerToken: true, sessionId: true, status: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  const { ok, data } = await wasenderGet(instancia.bearerToken, '/qr-code');
  if (!ok) {
    return NextResponse.json({ error: 'Falha ao gerar QR no WasenderAPI', detalhe: data }, { status: 502 });
  }

  await prisma.whatsappInstance.update({
    where: { id: params.id },
    data: { status: 'AGUARDANDO' },
  });

  // bearerToken nunca retorna — apenas o QR em base64
  return NextResponse.json({ success: true, qrCode: data.qrCode ?? data.qr ?? data });
}
