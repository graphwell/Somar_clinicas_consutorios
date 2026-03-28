import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const SECRET = '13201320';

function auth(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === SECRET;
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { acao, nicho, nome, adminPhone, motivoSuspensao, plano, statusAssinatura, diasTrial } = body;

  try {
    // ── Clinica ──────────────────────────────────────────────────────────────
    const clinicaData: any = {};
    if (nome) clinicaData.nome = nome;
    if (nicho) clinicaData.nicho = nicho;
    if (adminPhone !== undefined) clinicaData.adminPhone = adminPhone;

    if (acao === 'suspender_manual') {
      clinicaData.botActive = false;
      clinicaData.configBranding = { motivoSuspensao: motivoSuspensao ?? 'Suspenso manualmente' };
    } else if (acao === 'suspender_inadimplencia') {
      clinicaData.botActive = false;
      clinicaData.configBranding = { motivoSuspensao: 'Inadimplência' };
    } else if (acao === 'reativar') {
      clinicaData.botActive = true;
      clinicaData.configBranding = { motivoSuspensao: null };
    } else if (acao !== undefined) {
      // ação desconhecida — ignora
    } else {
      // PUT genérico legado
      if (body.statusBot !== undefined) clinicaData.botActive = body.statusBot === 'ativo';
    }

    if (Object.keys(clinicaData).length > 0) {
      await prisma.clinica.update({ where: { tenantId: id }, data: clinicaData });
    }

    // ── Assinatura ────────────────────────────────────────────────────────────
    const assinaturaData: any = {};
    if (plano) assinaturaData.plano = plano;
    if (statusAssinatura) assinaturaData.status = statusAssinatura;

    if (diasTrial && Number(diasTrial) > 0) {
      // Estende trial: soma os dias a partir de hoje
      assinaturaData.status = 'trial';
      // Guarda data fim do trial no campo updatedAt como referência (campo extra via configBranding na clinica)
    }

    if (Object.keys(assinaturaData).length > 0) {
      await prisma.assinatura.upsert({
        where: { tenantId: id },
        create: { tenantId: id, ...assinaturaData },
        update: assinaturaData,
      });
    }

    // Se deu trial days, salva a data no configBranding da clinica
    if (diasTrial && Number(diasTrial) > 0) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + Number(diasTrial));
      const clinica = await prisma.clinica.findUnique({ where: { tenantId: id }, select: { configBranding: true } });
      const branding = (clinica?.configBranding as any) ?? {};
      await prisma.clinica.update({
        where: { tenantId: id },
        data: { configBranding: { ...branding, trialEndsAt: trialEndsAt.toISOString() } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Deletar dados relacionados em ordem segura
    await prisma.assinatura.deleteMany({ where: { tenantId: id } });
    await prisma.notificacao.deleteMany({ where: { tenantId: id } });
    await prisma.clinica.delete({ where: { tenantId: id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
