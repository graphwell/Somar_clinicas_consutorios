import { NextResponse } from 'next/server'

export async function GET() {
  // NUNCA expor os valores reais — apenas verificar
  // se existem e se têm o prefixo correto

  const checks = {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY
        ? process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')
          ? '✅ live' : '⚠️ não é live'
        : '❌ ausente',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        ? '✅ presente'
        : '❌ ausente',
      priceStart: process.env.STRIPE_PRICE_START
        ? '✅ presente'
        : '❌ ausente',
      priceSolo: process.env.STRIPE_PRICE_SOLO
        ? '✅ presente'
        : '❌ ausente',
      pricePro: process.env.STRIPE_PRICE_PRO
        ? '✅ presente'
        : '❌ ausente',
      priceBusiness: process.env.STRIPE_PRICE_BUSINESS
        ? '✅ presente'
        : '❌ ausente',
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL.includes('synka.somar.ia.br')
          ? '✅ produção'
          : `⚠️ ${process.env.NEXT_PUBLIC_APP_URL}`
        : '❌ ausente',
    },
    database: {
      url: process.env.DATABASE_URL
        ? '✅ presente'
        : '❌ ausente',
    },
    n8n: {
      apiKey: process.env.N8N_API_KEY
        ? '✅ presente'
        : '❌ ausente — bot não vai autenticar',
      webhookUrl: process.env.N8N_WEBHOOK_URL
        ? process.env.N8N_WEBHOOK_URL.includes('n8n.somar.ia.br')
          ? '✅ produção'
          : `⚠️ ${process.env.N8N_WEBHOOK_URL}`
        : '❌ ausente — mensagens não chegam ao n8n',
    },
    whatsapp: {
      ultramsg: (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN)
        ? `✅ central configurada (${process.env.ULTRAMSG_INSTANCE_ID})`
        : '❌ não configurada',
      wasender: process.env.WASENDER_DEMO_API_KEY
        ? '✅ presente'
        : '⚠️ não configurada (Pro/Business sem WA próprio)',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY
        ? '✅ presente'
        : '❌ ausente',
    },
  }

  const temProblema = JSON.stringify(checks).includes('❌') || JSON.stringify(checks).includes('⚠️')

  return NextResponse.json({
    status: temProblema ? 'ATENÇÃO' : 'OK',
    ambiente: process.env.NODE_ENV,
    checks,
    timestamp: new Date().toISOString(),
  })
}
