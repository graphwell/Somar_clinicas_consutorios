import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';

export async function POST(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const tenantId = tenant.tenantId;

  // 1. Bloquear duplicação: Verificar se já tem instância vinculada
  const existente = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenantId },
    select: { ...INSTANCE_SELECT, status: true },
  });

  if (existente) {
    if (existente.status === 'EM_USO') {
      return NextResponse.json({ status: 'ja_configurado', instancia: existente });
    }
    if (existente.status === 'AGUARDANDO') {
      return NextResponse.json({ status: 'aguardando_scan', instancia: existente });
    }
    // Caso esteja OFFLINE ou outro, permitimos reconectar (mas já tem instância)
    return NextResponse.json({ status: 'aguardando_scan', instancia: existente });
  }

  // 2. Identificar plataforma correta baseada no plano
  const assinatura = await prisma.assinatura.findUnique({
    where: { tenantId },
    select: { plano: true },
  });

  // Se plano for trial, obrigatoriamente ULTRAMSG. Se não, prefere WASENDERAPI.
  const platformPreference = (assinatura?.plano === 'trial' || !assinatura) ? 'ULTRAMSG' : 'WASENDERAPI';

  try {
    // 3. Tentar reservar uma instância LIVRE do pool
    const instance = await WhatsAppPool.getAvailableInstance(platformPreference);

    if (!instance) {
      // 4. Sem instâncias disponíveis → Notificar Admin e mostrar estado de espera
      console.warn(`[Pool] Falha ao ativar ${tenantId}: Estoque esgotado para ${platformPreference}`);
      
      await prisma.notificacao.create({
        data: {
          tenantId,
          titulo: 'WhatsApp em configuração',
          mensagem: 'Estamos preparando sua instância. Você receberá acesso em breve.',
        },
      });

      return NextResponse.json({
        status: 'aguardando_instancia',
        mensagem: 'WhatsApp em configuração. Em breve você receberá acesso. Nossa equipe foi notificada.',
      });
    }

    // 5. Claim Atômico
    await WhatsAppPool.claimInstance(instance.id, tenantId);

    // 6. Configurar webhook (específico WaSender se for o caso)
    if (instance.plataforma === 'WASENDERAPI') {
      const webhookUrl = process.env.WASENDER_N8N_WEBHOOK_URL
        || `${process.env.NEXT_PUBLIC_APP_URL}/webhook/whatsapp-agent-dynamic`;

      await wasenderPost(instance.bearerToken, `/session/${instance.sessionId}/webhook`, {
        url: webhookUrl,
        events: ['message', 'connection', 'qrcode'],
      });

      await prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { webhookUrl },
      });
    }

    // 7. Gerar QR Code Inicial
    await prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { status: 'AGUARDANDO' },
    });

    // 7. Gerar QR Code Inicial via Provider centralizado
    await prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { status: 'AGUARDANDO' },
    });

    try {
      const qrCode = await WhatsAppProvider.getQrCode(
        instance.plataforma, 
        instance.sessionId, 
        instance.bearerToken
      );

      return NextResponse.json({
        status: 'qr_gerado',
        qrCode: qrCode,
        mensagem: 'Instância vinculada com sucesso! Escaneie o QR Code para ativar.',
      });
    } catch (err: any) {
      return NextResponse.json({
        status: 'qr_erro',
        mensagem: 'Instância vinculada, mas o QR Code falhou. Use o botão Reconectar para tentar novamente.',
      });
    }

  } catch (err: any) {
    console.error('[Ativar API] Erro crítico:', err.message);
    return NextResponse.json({ error: 'Erro ao ativar instância. Tente novamente.' }, { status: 500 });
  }
}
