import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';
import { confirmarPagamentoAssinatura } from '@/lib/confirmar-pagamento-assinatura';
import { syncIsSubscriber } from '@/lib/sync-subscriber';

const ALWAYS_OK  = (d: Record<string, unknown> = {}) => NextResponse.json({ ok: true,  ...d });
const ALWAYS_NOK = (e: string)                        => NextResponse.json({ ok: false, erro: e });

export async function POST(request: Request) {
  // ── Handler Pix / n8n (x-webhook-secret presente) ──────────────────────────
  const pixSecret = request.headers.get('x-webhook-secret');
  if (pixSecret !== undefined) {
    if (pixSecret !== (process.env.SUBSCRIPTIONS_WEBHOOK_SECRET ?? '')) {
      return NextResponse.json({}, { status: 401 });
    }
    let body: { evento?: string; assinaturaClienteId?: string; transacaoId?: string; tenantId?: string };
    try { body = await request.json(); } catch { return ALWAYS_OK({ aviso: 'Corpo inválido' }); }

    const { evento, assinaturaClienteId, transacaoId, tenantId } = body;
    if (!evento || !assinaturaClienteId || !tenantId) return ALWAYS_OK({ aviso: 'Campos ausentes' });

    const prisma = getTenantPrisma();
    try {
      if (evento === 'pagamento_confirmado') {
        await confirmarPagamentoAssinatura(assinaturaClienteId, transacaoId, tenantId, prisma);
        console.info(`[webhook] pagamento confirmado assinaturaId=${assinaturaClienteId} tenant=${tenantId}`);
        return ALWAYS_OK();
      }
      if (evento === 'pagamento_falhou') {
        const ass = await prisma.assinaturaCliente.findFirst({
          where: { id: assinaturaClienteId, tenantId }, select: { pacienteId: true },
        });
        if (ass) {
          await prisma.assinaturaCliente.update({ where: { id: assinaturaClienteId }, data: { status: 'inadimplente' } });
          await syncIsSubscriber(ass.pacienteId, prisma);
          console.info(`[webhook] pagamento falhou assinaturaId=${assinaturaClienteId}`);
        }
        return ALWAYS_OK();
      }
      return ALWAYS_OK({ aviso: `Evento desconhecido: ${evento}` });
    } catch (err: unknown) {
      console.error('[webhook-pix]', err);
      return ALWAYS_NOK(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Handler Stripe (stripe-signature presente) ──────────────────────────────
  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
  const sig       = request.headers.get('stripe-signature') || '';
  const rawBody   = await request.text();
  const secret    = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS || process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[SUBSCRIPTIONS_WEBHOOK] Assinatura inválida:', err);
    return new NextResponse('Webhook Signature Error', { status: 400 });
  }

  const prisma = getTenantPrisma();

  switch (event.type) {
    // Pagamento bem-sucedido → renovar contadores
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any;
      const subId   = typeof invoice.subscription === 'string'
        ? invoice.subscription : invoice.subscription?.id;
      if (!subId) break;

      const assinatura = await prisma.assinaturaCliente.findFirst({
        where:   { stripeSubId: subId },
        include: { plano: true },
      });
      if (!assinatura) break;

      const plano       = assinatura.plano as any;
      const servicosPlano = Array.isArray(plano.servicos) ? plano.servicos as any[] : [];
      const novoContador: Record<string, any> = {};
      for (const s of servicosPlano) {
        novoContador[s.servicoId] = {
          usado:  0,
          limite: s.tipo === 'ilimitado' ? null : (s.quantidade ?? null),
        };
      }

      const periodoInicio   = new Date();
      const periodoFim      = new Date(periodoInicio);
      if (plano.periodicidade === 'anual') {
        periodoFim.setFullYear(periodoFim.getFullYear() + 1);
      } else if (plano.periodicidade === 'trimestral') {
        periodoFim.setMonth(periodoFim.getMonth() + 3);
      } else {
        periodoFim.setMonth(periodoFim.getMonth() + 1);
      }

      await prisma.assinaturaCliente.update({
        where: { id: assinatura.id },
        data:  {
          status:          'ativo',
          contadorUso:     novoContador,
          periodoInicio,
          periodoFim,
          proximaCobranca: periodoFim,
          ultimaCobranca:  new Date(),
        },
      });
      break;
    }

    // Falha no pagamento → suspender
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const subId   = typeof invoice.subscription === 'string'
        ? invoice.subscription : invoice.subscription?.id;
      if (!subId) break;

      const assinatura = await prisma.assinaturaCliente.findFirst({
        where:   { stripeSubId: subId },
        include: { paciente: { select: { nome: true } }, plano: { select: { nome: true } } },
      });
      if (!assinatura) break;

      await prisma.assinaturaCliente.update({
        where: { id: assinatura.id },
        data:  { status: 'suspenso' },
      });

      // TODO: Enviar WhatsApp via WaSender notificando o cliente
      console.log(`[WEBHOOK] Assinatura suspensa — ${assinatura.paciente.nome} / ${assinatura.plano.nome}`);
      break;
    }

    // Subscription cancelada → cancelar
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const assinatura = await prisma.assinaturaCliente.findFirst({
        where: { stripeSubId: sub.id },
      });
      if (!assinatura) break;

      await prisma.assinaturaCliente.update({
        where: { id: assinatura.id },
        data:  { status: 'cancelado', dataFim: new Date() },
      });

      // Remover flag de assinante se não tiver outras assinaturas ativas
      const outraAtiva = await prisma.assinaturaCliente.findFirst({
        where: { pacienteId: assinatura.pacienteId, status: 'ativo' },
      });
      if (!outraAtiva) {
        await prisma.paciente.update({
          where: { id: assinatura.pacienteId },
          data:  { isSubscriber: false },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
