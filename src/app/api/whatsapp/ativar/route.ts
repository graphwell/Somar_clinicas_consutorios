import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant, wasenderPost } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';
import { WhatsAppPool } from '@/lib/whatsapp-pool';

export async function POST(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const tenantId = tenant.tenantId;

  // 1. Bloqueio de Segurança: Verificar se já existe instância vinculada
  const existente = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenantId },
    select: { id: true, sessionId: true, status: true, plataforma: true, numeroWa: true },
  });

  if (existente) {
    return NextResponse.json({
      status: existente.status === 'EM_USO' ? 'ja_configurado' : 'aguardando_scan',
      instancia: existente
    });
  }

  // 2. Determinar Plataforma via Assinatura Real
  const assinatura = await prisma.assinatura.findUnique({
    where: { tenantId },
    select: { plano: true },
  });

  // Regra Não Negociável: TRIAL -> ULTRAMSG, PAGO -> WASENDERAPI
  const isTrial = !assinatura || assinatura.plano === 'trial';
  const plataformaAlvo = isTrial ? 'ULTRAMSG' : 'WASENDERAPI';

  console.log(`[Ativar] Solicitando instância para ${tenantId} (Plano: ${assinatura?.plano || 'N/A'}, Plataforma: ${plataformaAlvo})`);

  try {
    // 3. Seleção Exclusiva via Pool Real (SEM MOCKS)
    const instance = await WhatsAppPool.getAvailableInstance(plataformaAlvo);

    if (!instance) {
      console.warn(`[Pool] ESTOQUE ESGOTADO: ${plataformaAlvo} não disponível para ${tenantId}`);
      
      return NextResponse.json({
        status: 'WAITING_INSTANCE',
        mensagem: 'Estamos preparando seu WhatsApp. Aguarde ou tente novamente em instantes.'
      });
    }

    // 4. Claim Atômico: Reserva a instância para este tenant
    await WhatsAppPool.claimInstance(instance.id, tenantId);

    // 5. Configuração Técnica (Webhooks se for WaSender)
    if (instance.plataforma === 'WASENDERAPI') {
      const webhookUrl = process.env.WASENDER_N8N_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`;
      
      try {
        await wasenderPost(instance.bearerToken, `/session/${instance.sessionId}/webhook`, {
          url: webhookUrl,
          events: ['message', 'connection', 'qrcode']
        });
        
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: { webhookUrl }
        });
      } catch (webhookErr) {
        console.error(`[Webhook] Falha ao configurar webhook WaSender para ${instance.sessionId}`);
      }
    }

    // 6. Preparação para QR Code
    await prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { status: 'AGUARDANDO' }
    });

    // 7. Resposta de Sucesso Inicial
    return NextResponse.json({
      status: 'qr_gerado_inicial',
      mensagem: 'Instância vinculada com sucesso! Preparando QR Code...',
      instancia: {
        id: instance.id,
        sessionId: instance.sessionId,
        plataforma: instance.plataforma
      }
    });

  } catch (err: any) {
    console.error(`[Ativar API] Erro crítico para ${tenantId}:`, err.message);
    return NextResponse.json({ error: 'Erro ao processar ativação. Entre em contato com o suporte.' }, { status: 500 });
  }
}
