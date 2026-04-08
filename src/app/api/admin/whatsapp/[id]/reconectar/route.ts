import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, bearerToken: true, sessionId: true, plataforma: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  try {
    const qrCode = await WhatsAppProvider.getQrCode(
      instancia.plataforma, 
      instancia.sessionId, 
      instancia.bearerToken
    );

    await prisma.whatsappInstance.update({
      where: { id: params.id },
      data: { status: 'AGUARDANDO', conectadoEm: null },
    });

    return NextResponse.json({ success: true, qrCode });
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Falha ao gerar QR Code no provedor', 
      detalhe: err.message 
    }, { status: 502 });
  }
}
