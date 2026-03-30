import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { wasenderGet } from '@/lib/wasender';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const config = await prisma.marketingConfig.findUnique({ where: { tenantId } });
    if (!config?.wasenderApiKey) {
      return NextResponse.json({ status: 'nao_configurado', message: 'API Key não configurada' });
    }

    const res = await wasenderGet(config.wasenderApiKey, '/whatsapp-sessions');
    if (res.ok) {
      return NextResponse.json({ status: 'conectado', sessions: res.data });
    }
    return NextResponse.json({ status: 'erro', message: `HTTP ${res.status}` });
  } catch (error: any) {
    return NextResponse.json({ status: 'erro', message: error.message }, { status: 500 });
  }
}
