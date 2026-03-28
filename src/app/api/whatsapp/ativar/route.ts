import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant, wasenderPost, wasenderGet, INSTANCE_SELECT } from '@/lib/wasender';

export async function POST(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const tenantId = tenant.tenantId;

  // 1. Verificar se empresa já tem instância
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
  }

  // 2. Tentar reservar uma instância LIVRE do pool (transação atômica)
  const claimed = await prisma.$transaction(async (tx) => {
    const livre = await tx.whatsappInstance.findFirst({
      where: { status: 'LIVRE' },
      select: { id: true, bearerToken: true, sessionId: true },
    });
    if (!livre) return null;
    return tx.whatsappInstance.update({
      where: { id: livre.id },
      data: {
        empresaId: tenantId,
        status: 'EM_USO',
        conectadoEm: new Date(),
      },
      select: { id: true, bearerToken: true, sessionId: true },
    });
  });

  // 3. Sem instâncias disponíveis → notificar e colocar na fila
  if (!claimed) {
    const empresa = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { nome: true },
    });

    // Notificação para a empresa (visível no painel dela)
    await prisma.notificacao.create({
      data: {
        tenantId,
        titulo: 'WhatsApp em configuração',
        mensagem: 'Sua instância WhatsApp está sendo preparada. Em breve você receberá acesso. Nossa equipe foi notificada.',
      },
    });

    // Notificação para o pool admin (alerta de estoque)
    // Registrada com um tenantId especial de controle interno
    const adminTenant = await prisma.clinica.findFirst({
      where: { nicho: 'CLINICA_MEDICA' as any },
      select: { tenantId: true },
      orderBy: { createdAt: 'asc' },
    });
    if (adminTenant) {
      await prisma.notificacao.create({
        data: {
          tenantId: adminTenant.tenantId,
          titulo: '⚠️ Estoque WhatsApp esgotado',
          mensagem: `A empresa "${empresa?.nome ?? tenantId}" solicitou uma instância WhatsApp mas não há disponíveis no pool. Compre mais instâncias no WasenderAPI.`,
        },
      });
    }

    return NextResponse.json({
      status: 'aguardando_instancia',
      mensagem: 'WhatsApp em configuração. Em breve você receberá acesso. Nossa equipe foi notificada.',
    });
  }

  // 4. Configurar webhook no WasenderAPI apontando para o N8N
  const webhookUrl = process.env.WASENDER_N8N_WEBHOOK_URL
    || `${process.env.NEXT_PUBLIC_APP_URL}/webhook/whatsapp-agent-dynamic`;

  await wasenderPost(claimed.bearerToken, `/session/${claimed.sessionId}/webhook`, {
    url: webhookUrl,
    events: ['message', 'connection', 'qrcode'],
  });

  // 5. Gerar QR Code
  const { ok, data } = await wasenderGet(claimed.bearerToken, '/qr-code');

  await prisma.whatsappInstance.update({
    where: { id: claimed.id },
    data: {
      status: 'AGUARDANDO',
      webhookUrl,
    },
  });

  if (!ok) {
    return NextResponse.json({
      status: 'qr_erro',
      mensagem: 'Instância vinculada, mas houve um erro ao gerar o QR. Use o botão Reconectar para tentar novamente.',
    });
  }

  return NextResponse.json({
    status: 'qr_gerado',
    qrCode: data.qrCode ?? data.qr ?? data,
    mensagem: 'Escaneie o QR Code abaixo com o WhatsApp da sua empresa.',
  });
}
