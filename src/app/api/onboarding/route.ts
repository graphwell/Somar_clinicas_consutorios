import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { planoTrialPorNicho } from '@/lib/planos-synka';
import { getSessionInfo } from '@/lib/auth-helpers';

function gerarSlugBase(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60);
}

async function gerarSlugUnico(base: string): Promise<string> {
  const existing = await prisma.clinica.findUnique({ where: { slug: base }, select: { slug: true } });
  if (!existing) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const exists = await prisma.clinica.findUnique({ where: { slug: candidate }, select: { slug: true } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(request: Request) {
  try {
    // tenantId vem do JWT (middleware), não do body — previne manipulação entre tenants
    const { tenantId } = await getSessionInfo();
    const { nicho, multiProfissional, nomeClinica, telefoneClinica, openingTime, closingTime, workingDays } = await request.json();

    if (!tenantId || !nicho) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
    }

    // Gerar slug a partir do nome da clínica se ainda não tiver um válido
    const clinicaAtual = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { slug: true, nome: true },
    });

    const updateData: any = {
      nicho,
      multiProfissional: Boolean(multiProfissional),
      onboardingCompleted: true,
    };

    if (nomeClinica) updateData.nome = nomeClinica;
    if (telefoneClinica) updateData.adminPhone = telefoneClinica;
    if (openingTime) updateData.openingTime = openingTime;
    if (closingTime) updateData.closingTime = closingTime;
    if (workingDays) updateData.workingDays = workingDays;

    const nomeParaSlug = nomeClinica || clinicaAtual?.nome || 'minha-clinica';
    const isDefaultSlug = !clinicaAtual?.slug || clinicaAtual.slug === 'clinica-default';
    if (isDefaultSlug) {
      const slugBase = gerarSlugBase(nomeParaSlug);
      updateData.slug = await gerarSlugUnico(slugBase);
    }

    const updated = await prisma.clinica.update({
      where: { tenantId },
      data: updateData,
    });

    // Ajustar plano trial pelo nicho (beleza→pro, saúde→business)
    const planoTrial = planoTrialPorNicho(nicho);
    await prisma.assinatura.upsert({
      where: { tenantId },
      create: {
        tenantId,
        status: 'trial',
        plano: planoTrial,
        trialInicio: new Date(),
        trialFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        plano: planoTrial,
      },
    });

    return NextResponse.json({ success: true, onboardingCompleted: updated.onboardingCompleted });
  } catch (error: any) {
    console.error('[API_ONBOARDING_ERROR]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json({ 
      error: 'Erro interno ao salvar configurações', 
      details: error.message 
    }, { status: 500 });
  }
}
