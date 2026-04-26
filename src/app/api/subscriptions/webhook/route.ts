import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { confirmarPagamentoAssinatura } from '@/lib/confirmar-pagamento-assinatura';
import { syncIsSubscriber } from '@/lib/sync-subscriber';

export const dynamic = 'force-dynamic';

const OK  = (d: Record<string, unknown> = {}) => NextResponse.json({ ok: true,  ...d });
const NOK = (e: string)                        => NextResponse.json({ ok: false, erro: e });

/**
 * POST /api/subscriptions/webhook
 * Webhook exclusivo para eventos Pix / n8n de cobranças de assinatura.
 * Segurança: header x-webhook-secret validado contra SUBSCRIPTIONS_WEBHOOK_SECRET.
 * Retorna sempre 200 para evitar retry loop do n8n.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');

  if (!secret || secret !== (process.env.SUBSCRIPTIONS_WEBHOOK_SECRET ?? '')) {
    return NextResponse.json({}, { status: 401 });
  }

  let body: {
    evento?: string;
    assinaturaClienteId?: string;
    transacaoId?: string;
    tenantId?: string;
    valor?: number;
  };

  try {
    body = await req.json();
  } catch {
    return OK({ aviso: 'Corpo inválido — ignorado' });
  }

  const { evento, assinaturaClienteId, transacaoId, tenantId } = body;

  if (!evento || !assinaturaClienteId || !tenantId) {
    return OK({ aviso: 'Campos obrigatórios ausentes — ignorado' });
  }

  const prisma = getTenantPrisma();

  try {
    if (evento === 'pagamento_confirmado') {
      await confirmarPagamentoAssinatura(assinaturaClienteId, transacaoId, tenantId, prisma);
      console.info(`[webhook] pagamento confirmado assinaturaId=${assinaturaClienteId} tenant=${tenantId}`);
      return OK();
    }

    if (evento === 'pagamento_falhou') {
      const ass = await prisma.assinaturaCliente.findFirst({
        where:  { id: assinaturaClienteId, tenantId },
        select: { pacienteId: true },
      });
      if (ass) {
        await prisma.assinaturaCliente.update({
          where: { id: assinaturaClienteId },
          data:  { status: 'inadimplente' },
        });
        await syncIsSubscriber(ass.pacienteId, prisma);
        // NÃO aplicar blacklist — inadimplência não é no-show (Fase 3)
        console.info(`[webhook] pagamento falhou assinaturaId=${assinaturaClienteId} tenant=${tenantId}`);
      }
      return OK();
    }

    return OK({ aviso: `Evento desconhecido: ${evento}` });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[subscriptions/webhook] erro evento=${evento} id=${assinaturaClienteId}`, err);
    // Sempre 200 — evita retry loop do n8n
    return NOK(msg);
  }
}
