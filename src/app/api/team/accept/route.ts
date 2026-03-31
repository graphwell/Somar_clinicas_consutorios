import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

// POST /api/team/accept — aceitar convite com senha ou vincular conta existente
export async function POST(request: Request) {
  try {
    const { token, nome, senha } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório.' }, { status: 400 });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 404 });
    }

    if (!senha || senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    // Verificar se já existe usuário com este email
    let usuario = await prisma.usuario.findUnique({ where: { email: invite.email } });

    if (usuario) {
      // Já tem conta — verificar se não está no mesmo tenant
      if (usuario.tenantId === invite.tenantId) {
        return NextResponse.json({ error: 'Você já faz parte desta equipe.' }, { status: 400 });
      }
      // Usuário existe em outro tenant — não é suportado (multi-tenant por usuário futuro)
      return NextResponse.json({
        error: 'Este email já tem conta no Synka. Use o fluxo de login para aceitar o convite.',
        code: 'USUARIO_EXISTE',
      }, { status: 409 });
    }

    const senhaHash = await hashPassword(senha);
    const nomeDefinitivo = nome || invite.nome || invite.email.split('@')[0];

    usuario = await prisma.usuario.create({
      data: {
        email: invite.email,
        senhaHash,
        role: invite.role === 'temporario' ? 'recepcao' : invite.role,
        tenantId: invite.tenantId,
        nome: nomeDefinitivo,
        emailVerificado: true, // convite já confirma o email
        primeiroAcesso: true,
        acessoExpiraEm: invite.role === 'temporario' ? invite.expiresAt : null,
      },
    });

    // Se for profissional, criar registro de Profissional vinculado
    if (invite.role === 'profissional') {
      const prof = await prisma.profissional.create({
        data: {
          nome: nomeDefinitivo,
          especialidade: invite.especialidade || null,
          tenantId: invite.tenantId,
          ativo: true,
        },
      });
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { profissionalId: prof.id },
      });
      usuario = { ...usuario, profissionalId: prof.id } as any;
    }

    await prisma.inviteToken.update({ where: { token }, data: { used: true } });

    const jwt = await signToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      tenantId: usuario.tenantId,
      profissionalId: (usuario as any).profissionalId || undefined,
      acessoExpiraEm: usuario.acessoExpiraEm?.toISOString(),
    });

    const clinica = await prisma.clinica.findUnique({ where: { tenantId: invite.tenantId }, select: { nome: true, slug: true } });

    return NextResponse.json({
      success: true,
      token: jwt,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        tenantId: usuario.tenantId,
        clinica: clinica?.nome || null,
        slug: clinica?.slug || null,
      },
    });
  } catch (error: any) {
    console.error('[ACCEPT_INVITE_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao aceitar convite.' }, { status: 500 });
  }
}
