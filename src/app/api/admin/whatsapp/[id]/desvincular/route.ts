import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, wasenderDelete, INSTANCE_SELECT } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSynkaAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

    const instancia = await prisma.whatsappInstance.findUnique({
      where: { id: params.id },
      select: { id: true, sessionId: true, bearerToken: true, plataforma: true },
    });

    if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

    // Logout remoto opcional
    try {
      await WhatsAppProvider.logout(instancia.plataforma, instancia.sessionId, instancia.bearerToken);
    } catch (e) {
      console.warn('Logout remoto falhou no desvio', e);
    }

    const atualizado = await prisma.whatsappInstance.update({
      where: { id: params.id },
      data: {
        empresaId: null,
        status: 'LIVRE',
        webhookUrl: null,
        conectadoEm: null,
        numeroWa: null,
      },
      select: INSTANCE_SELECT,
    });

    return NextResponse.json({ success: true, instancia: atualizado });
  } catch (err: any) {
    console.error('[Admin] Erro ao desvincular:', err);
    return NextResponse.json({ error: `Erro no servidor: ${err.message}` }, { status: 500 });
  }
}
