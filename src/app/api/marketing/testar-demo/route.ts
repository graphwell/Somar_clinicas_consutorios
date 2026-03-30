import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import { wasenderPost, wasenderGet } from '@/lib/wasender';

/**
 * POST /api/marketing/testar-demo
 * Envia uma mensagem de teste usando a instância demo para o WASENDER_DEMO_PHONE.
 * Útil para validar que a instância demo está ativa antes de configurar a própria.
 */
export async function POST() {
  try {
    await getSessionInfo(); // só precisa estar autenticado

    const demoKey = process.env.WASENDER_DEMO_API_KEY;
    const demoPhone = process.env.WASENDER_DEMO_PHONE;

    if (!demoKey) {
      return NextResponse.json({ status: 'nao_configurado', message: 'WASENDER_DEMO_API_KEY não configurada no servidor' });
    }
    if (!demoPhone) {
      return NextResponse.json({ status: 'nao_configurado', message: 'WASENDER_DEMO_PHONE não configurado no servidor' });
    }

    const mensagem = `🧪 *Teste da Instância Demo — Synka*\n\nSe você recebeu esta mensagem, a instância demo está funcionando corretamente!\n\n_${new Date().toLocaleString('pt-BR')}_ ✅`;

    const result = await wasenderPost(demoKey, '/messages/send', {
      to: demoPhone,
      message: mensagem,
    });

    if (result.ok) {
      return NextResponse.json({ status: 'ok', message: `Mensagem de teste enviada para ${demoPhone}` });
    }

    return NextResponse.json({ status: 'erro', message: `Erro HTTP ${result.status}`, data: result.data });
  } catch (error: any) {
    return NextResponse.json({ status: 'erro', message: error.message }, { status: 500 });
  }
}

/**
 * GET /api/marketing/testar-demo
 * Verifica se a instância demo está configurada e ativa (sem enviar mensagem).
 */
export async function GET() {
  try {
    await getSessionInfo();

    const demoKey = process.env.WASENDER_DEMO_API_KEY;
    const demoPhone = process.env.WASENDER_DEMO_PHONE;
    const forceDemo = process.env.MARKETING_DEMO_MODE === 'true';

    if (!demoKey) {
      return NextResponse.json({ configured: false, active: false, forceDemo, demoPhone: null });
    }

    // Verifica sessões disponíveis na instância demo
    const res = await wasenderGet(demoKey, '/whatsapp-sessions');

    return NextResponse.json({
      configured: true,
      active: res.ok,
      forceDemo,
      demoPhone: demoPhone ?? null,
      sessions: res.ok ? res.data : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ configured: false, active: false, forceDemo: false, demoPhone: null });
  }
}
