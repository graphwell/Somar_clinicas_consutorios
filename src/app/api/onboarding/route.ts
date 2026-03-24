import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { tenantId, nicho, multiProfissional } = await request.json();

    if (!tenantId || !nicho) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
    }

    const updated = await prisma.clinica.update({
      where: { tenantId },
      data: {
        nicho,
        multiProfissional: Boolean(multiProfissional),
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({ success: true, onboardingCompleted: updated.onboardingCompleted });
  } catch (error: any) {
    console.error('[API_ONBOARDING_ERROR]', error);
    return NextResponse.json({ 
      error: 'Erro interno ao salvar configurações', 
      details: error.message 
    }, { status: 500 });
  }
}
