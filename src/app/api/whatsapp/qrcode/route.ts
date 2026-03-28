import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant, wasenderGet } from '@/lib/wasender';

export async function GET(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const instancia = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenant.tenantId },
    select: { id: true, bearerToken: true, sessionId: true, status: true },
  });

  if (!instancia) {
    return NextResponse.json(
      { error: 'Nenhuma instância WhatsApp vinculada a esta empresa. Entre em contato com o suporte.' },
      { status: 404 }
    );
  }

  const { ok, data } = await wasenderGet(instancia.bearerToken, '/qr-code');
  if (!ok) {
    return NextResponse.json({ error: 'Não foi possível gerar o QR Code. Tente novamente.' }, { status: 502 });
  }

  await prisma.whatsappInstance.update({
    where: { id: instancia.id },
    data: { status: 'AGUARDANDO' },
  });

  // bearerToken nunca retorna — apenas o QR em base64
  return NextResponse.json({ success: true, qrCode: data.qrCode ?? data.qr ?? data });
}
