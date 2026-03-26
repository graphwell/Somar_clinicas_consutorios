import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, senha, nomeClinica, nomeResponsavel } = await request.json();

    if (!email || !senha || !nomeClinica) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 });
    }

    const tenantId = `tenant_${crypto.randomUUID().substring(0, 8)}`;
    const slug = nomeClinica.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || 'clinica';

    // Criar Clínica e Usuário em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const clinica = await tx.clinica.create({
        data: {
          tenantId,
          nome: nomeClinica,
          slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
          onboardingCompleted: false
        }
      });

      const senhaHash = await hashPassword(senha);
      const usuario = await tx.usuario.create({
        data: {
          nome: nomeResponsavel,
          email,
          senhaHash,
          role: 'admin',
          tenantId: clinica.tenantId
        }
      });

      return { usuario, clinica };
    });

    const token = await signToken({
      userId: result.usuario.id,
      email: result.usuario.email,
      role: result.usuario.role,
      tenantId: result.usuario.tenantId,
    });

    return NextResponse.json({
      token,
      user: {
        id: result.usuario.id,
        email: result.usuario.email,
        role: result.usuario.role,
        tenantId: result.usuario.tenantId,
        clinica: result.clinica.nome,
        slug: result.clinica.slug,
      },
    });

  } catch (error: any) {
    console.error('[AUTH_REGISTER_ERROR]:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 });
  }
}
