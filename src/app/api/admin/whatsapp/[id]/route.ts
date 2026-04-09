import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, INSTANCE_SELECT } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSynkaAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });

    const instancia = await prisma.whatsappInstance.findUnique({
      where: { id: params.id },
    });

    if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

    // Tentativa de logout opcional
    try {
      await WhatsAppProvider.logout(instancia.plataforma, instancia.sessionId, instancia.bearerToken);
    } catch (e) {
      console.warn('Logout falhou na exclusão', e);
    }

    // Exclusão incondicional no DB
    await prisma.whatsappInstance.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, mensagem: 'Instância excluída com sucesso' });
  } catch (err: any) {
    console.error('[Admin] Erro ao excluir:', err);
    return NextResponse.json({ error: `Erro técnico: ${err.message}` }, { status: 500 });
  }
}
