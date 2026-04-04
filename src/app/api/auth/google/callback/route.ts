import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import crypto from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://synka.somar.ia.br';

// GET /api/auth/google/callback — recebe o code do Google e autentica
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=google_cancelado`);
  }

  try {
    // 1. Trocar code por access_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[GOOGLE_OAUTH] token error:', tokenData);
      return NextResponse.redirect(`${APP_URL}/auth/login?error=google_token`);
    }

    // 2. Buscar dados do usuário no Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleData = await userRes.json();
    if (!userRes.ok || !googleData.email) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=google_dados`);
    }

    // 3. Verificar se usuário já existe
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [{ googleId: googleData.id }, { email: googleData.email }],
      },
      include: { clinica: true },
    });

    let redirectTo = '/dashboard';

    if (usuario) {
      // 4a. Usuário existente — vincular googleId se ainda não tiver
      if (!usuario.googleId) {
        usuario = await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            googleId: googleData.id,
            googleEmail: googleData.email,
            emailVerificado: true,
            avatarUrl: usuario.avatarUrl || googleData.picture || null,
          },
          include: { clinica: true },
        });
      }
      redirectTo = usuario.clinica?.onboardingCompleted ? '/dashboard' : '/onboarding';
    } else {
      // 4c. Novo usuário — criar clínica básica e ir para onboarding
      const tenantId = `tenant_${crypto.randomUUID().substring(0, 8)}`;
      const nomeClinica = `Clínica de ${googleData.given_name || googleData.name || 'Novo Usuário'}`;
      const slugBase = nomeClinica.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || 'clinica';
      const slug = `${slugBase}-${crypto.randomUUID().substring(0, 6)}`;

      const result = await prisma.$transaction(async (tx) => {
        const clinica = await tx.clinica.create({
          data: {
            tenantId,
            nome: nomeClinica,
            slug,
            onboardingCompleted: false,
          },
        });
        const novoUsuario = await tx.usuario.create({
          data: {
            nome: googleData.given_name || googleData.name,
            sobrenome: googleData.family_name || null,
            email: googleData.email,
            googleId: googleData.id,
            googleEmail: googleData.email,
            emailVerificado: true,
            avatarUrl: googleData.picture || null,
            role: 'admin',
            tenantId: clinica.tenantId,
            primeiroAcesso: true,
          },
        });
        return { clinica, usuario: novoUsuario };
      });
      usuario = { ...result.usuario, clinica: result.clinica } as any;
      redirectTo = '/onboarding';
    }

    // 5. Gerar JWT
    const token = await signToken({
      userId: usuario!.id,
      email: usuario!.email,
      role: usuario!.role,
      tenantId: usuario!.tenantId,
      profissionalId: usuario!.profissionalId || undefined,
      acessoExpiraEm: usuario!.acessoExpiraEm?.toISOString(),
    });

    // 6. Redirecionar com token via cookie e query param (frontend salva no localStorage)
    const response = NextResponse.redirect(`${APP_URL}/auth/google-success?token=${token}&redirect=${redirectTo}`);
    response.cookies.set('synka-auth-temp', token, {
      httpOnly: false, // precisa ser lido pelo JS para salvar no localStorage
      maxAge: 60, // 60 segundos — apenas para a transição
      path: '/',
      sameSite: 'lax',
    });
    return response;
  } catch (err: any) {
    console.error('[GOOGLE_OAUTH_ERROR]', {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      stack: err?.stack?.substring(0, 500),
    });
    return NextResponse.redirect(`${APP_URL}/auth/login?error=google_interno`);
  }
}
