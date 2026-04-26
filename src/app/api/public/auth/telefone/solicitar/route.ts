import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWasenderConfig, ultraMsgPost, wasenderPost } from '@/lib/wasender';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { telefone?: string; slug?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

  const telefone = (body.telefone ?? '').replace(/\D/g, '');
  const slug     = body.slug ?? '';

  if (telefone.length < 10 || telefone.length > 11) {
    return NextResponse.json({ error: 'TELEFONE_INVALIDO' }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
  }

  const clinica = await prisma.clinica.findUnique({
    where:  { slug },
    select: { tenantId: true },
  });
  if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
  const { tenantId } = clinica;

  // Rate limit: máx 3 solicitações por hora por telefone + tenant
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
  const tentativasRecentes = await prisma.verificacaoTelefone.count({
    where: { telefone, tenantId, createdAt: { gte: umaHoraAtras } },
  });
  if (tentativasRecentes >= 3) {
    return NextResponse.json(
      { error: 'MUITAS_TENTATIVAS', mensagem: 'Tente novamente em 1 hora.' },
      { status: 429 },
    );
  }

  const codigo    = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.verificacaoTelefone.create({
    data: { telefone, codigo, tenantId, expiresAt, tentativas: 0, usado: false },
  });

  // Enviar via WhatsApp — sem restrição de horário para OTP
  const mensagem = `Seu código para agendar: *${codigo}*\nVálido por 10 minutos. Não compartilhe.`;
  try {
    const cfg = getWasenderConfig(null);
    if (cfg.ultraMsg) {
      await ultraMsgPost(cfg.ultraMsg.instanceId, cfg.ultraMsg.token, 'messages/chat', {
        to: telefone, body: mensagem,
      });
    } else if (cfg.apiKey) {
      await wasenderPost(cfg.apiKey, '/messages/send', { to: telefone, message: mensagem });
    } else {
      console.warn('[OTP] Nenhuma instância WhatsApp configurada — código não enviado');
    }
  } catch (err) {
    console.error('[OTP solicitar] Falha ao enviar WhatsApp:', err);
    // Não bloquear o fluxo se o envio falhar
  }

  return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
}
