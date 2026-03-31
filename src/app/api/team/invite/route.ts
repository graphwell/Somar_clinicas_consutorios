import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';
import { enviarConviteProfissional } from '@/lib/emails';
import { randomUUID } from 'crypto';

// POST /api/team/invite — admin envia convite
export async function POST(request: Request) {
  try {
    const { tenantId, userId, role: myRole } = await getSessionInfo();

    if (myRole !== 'admin' && myRole !== 'synka_admin') {
      return NextResponse.json({ error: 'Apenas administradores podem enviar convites.' }, { status: 403 });
    }

    const { email, nome, role, especialidade, acessoExpiraEm } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'email e role são obrigatórios.' }, { status: 400 });
    }

    const rolesValidos = ['admin', 'recepcao', 'profissional', 'temporario'];
    if (!rolesValidos.includes(role)) {
      return NextResponse.json({ error: `role inválido. Use: ${rolesValidos.join(', ')}` }, { status: 400 });
    }

    if (role === 'temporario' && !acessoExpiraEm) {
      return NextResponse.json({ error: 'acessoExpiraEm é obrigatório para acesso temporário.' }, { status: 400 });
    }

    // Verificar se email já pertence ao tenant
    const jaExiste = await prisma.usuario.findFirst({ where: { email, tenantId } });
    if (jaExiste) {
      return NextResponse.json({ error: 'Este email já faz parte da sua equipe.' }, { status: 400 });
    }

    // Duração do convite
    const horasValidade = role === 'temporario' ? 72 : 48;
    const expiresAt = new Date(Date.now() + horasValidade * 60 * 60 * 1000);
    const token = randomUUID();

    await prisma.inviteToken.create({
      data: { token, email, nome: nome || null, role, especialidade: especialidade || null, tenantId, convidadoPor: userId, expiresAt },
    });

    // Buscar dados da clínica e do admin para o email
    const [clinica, admin] = await Promise.all([
      prisma.clinica.findUnique({ where: { tenantId }, select: { nome: true } }),
      prisma.usuario.findUnique({ where: { id: userId }, select: { nome: true } }),
    ]);

    await enviarConviteProfissional(
      email,
      nome || email,
      clinica?.nome || 'Synka',
      admin?.nome || 'Administrador',
      role,
      token,
      expiresAt
    );

    return NextResponse.json({ success: true, expiresAt });
  } catch (error: any) {
    console.error('[TEAM_INVITE_ERROR]', error);
    return NextResponse.json({ error: 'Erro interno ao enviar convite.' }, { status: 500 });
  }
}

// GET /api/team/invite?token=xxx — validar token (público, sem auth)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token não informado.' }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 404 });
  }

  // Buscar nome da clínica para exibir na tela de convite
  const clinica = await prisma.clinica.findUnique({
    where: { tenantId: invite.tenantId },
    select: { nome: true, configBranding: true },
  });

  // Buscar nome de quem convidou
  let nomeAdmin: string | null = null;
  if (invite.convidadoPor) {
    const admin = await prisma.usuario.findUnique({ where: { id: invite.convidadoPor }, select: { nome: true } });
    nomeAdmin = admin?.nome || null;
  }

  return NextResponse.json({
    email: invite.email,
    nome: invite.nome,
    role: invite.role,
    especialidade: invite.especialidade,
    tenantId: invite.tenantId,
    expiresAt: invite.expiresAt,
    clinica: {
      nome: clinica?.nome || null,
      logoUrl: (clinica?.configBranding as any)?.logoUrl || null,
    },
    convidadoPor: nomeAdmin,
  });
}
