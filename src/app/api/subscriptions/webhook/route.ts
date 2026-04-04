import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';

export async function POST(request: Request) {
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
