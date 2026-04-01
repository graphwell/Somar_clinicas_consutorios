import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Nenhum token fornecido.' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.tenantId || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const tenantId = payload.tenantId;
    const prisma = getTenantPrisma();

    // Buscar usuário para capturar as permissões mais atualizadas
    const user = await prisma.usuario.findFirst({
      where: { id: payload.userId, clinica: { tenantId } },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo.' }, { status: 403 });
    }

    // Buscar ou criar Assinatura
    let assinatura = await prisma.assinatura.findUnique({
      where: { tenantId }
    });

    if (!assinatura) {
      // Se a assinatura não existir, cria a base de trial por segurança
      assinatura = await prisma.assinatura.create({
        data: {
          tenantId,
          status: 'trial',
          plano: 'trial',
          trialFim: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // +15 dias default
        }
      });
    }

    // Validar status do Trial
    const agora = new Date();
    let planStatus = assinatura.status;

    if (assinatura.status === 'trial' && assinatura.trialFim && agora > assinatura.trialFim) {
      planStatus = 'expired';
      assinatura = await prisma.assinatura.update({
        where: { tenantId },
        data: { status: 'expired' }
      });
    }

    // Calcular expiração do trial em dias caso ainda esteja no trial
    let diasTrial: number | null = null;
    if (planStatus === 'trial' && assinatura.trialFim) {
      const diffMs = assinatura.trialFim.getTime() - agora.getTime();
      diasTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      user: {
        id: payload.userId,
        role: user.role,
        tenantId
      },
      planStatus: planStatus, // 'trial', 'active', 'expired', 'past_due'
      plano: assinatura.plano,
      trialFim: assinatura.trialFim,
      diasRestantesTrial: diasTrial,
      permissaoAcesso: planStatus === 'active' || planStatus === 'trial'
    });

  } catch (error) {
    console.error('[AUTH_ME_ERROR]', error);
    return NextResponse.json({ error: 'Erro de validação do perfil.' }, { status: 500 });
  }
}
