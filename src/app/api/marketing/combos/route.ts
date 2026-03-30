import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();
    const combos = await prisma.marketingCombo.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(combos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();
    const { nome, descricao, servicos, gatilhoServico, precoOriginal, precoCombo, descontoPct, validadeDias, templateWhatsapp } = body;

    if (!nome || !precoCombo || !Array.isArray(servicos) || servicos.length === 0) {
      return NextResponse.json({ error: 'nome, precoCombo e servicos são obrigatórios' }, { status: 400 });
    }

    const combo = await prisma.marketingCombo.create({
      data: {
        tenantId,
        nome,
        descricao: descricao ?? null,
        servicos,
        gatilhoServico: gatilhoServico ?? null,
        precoOriginal: precoOriginal ? Number(precoOriginal) : null,
        precoCombo: Number(precoCombo),
        descontoPct: descontoPct ? Number(descontoPct) : null,
        validadeDias: validadeDias ? Number(validadeDias) : 30,
        templateWhatsapp: templateWhatsapp ?? null,
      },
    });

    return NextResponse.json(combo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
