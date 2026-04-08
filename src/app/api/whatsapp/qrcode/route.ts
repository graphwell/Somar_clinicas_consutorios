import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';

export async function GET(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const instancia = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenant.tenantId },
    select: { id: true, bearerToken: true, sessionId: true, status: true, plataforma: true },
  });

  if (!instancia) {
    return NextResponse.json(
      { error: 'Nenhuma instância WhatsApp vinculada a esta empresa. Entre em contato com o suporte.' },
      { status: 404 }
    );
  }

  try {
    const qrCode = await WhatsAppProvider.getQrCode(
      instancia.plataforma, 
      instancia.sessionId, 
      instancia.bearerToken
    );

    await prisma.whatsappInstance.update({
      where: { id: instancia.id },
      data: { status: 'AGUARDANDO' },
    });

    return NextResponse.json({ success: true, qrCode });
  } catch (err: any) {
    console.error('[QR Code API] Erro:', err.message);
    return NextResponse.json({ error: 'Não foi possível gerar o QR Code. Tente novamente.' }, { status: 502 });
  }
}
