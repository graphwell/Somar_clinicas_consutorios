import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function verificarAdminSecret(request: Request): boolean {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return false;
  const { searchParams } = new URL(request.url);
  const secretFromQuery = searchParams.get('secret');
  const secretFromHeader = request.headers.get('x-admin-secret');
  return secretFromHeader === ADMIN_SECRET || secretFromQuery === ADMIN_SECRET;
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!verificarAdminSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        emailVerificado: true,
        primeiroAcesso: true,
        perfilCompleto: true,
        acessoExpiraEm: true,
        avatarUrl: true,
        googleId: true,
        googleEmail: true,
        tenantId: true,
        profissionalId: true,
        createdAt: true,
        updatedAt: true,
        clinica: {
          select: {
            id: true,
            tenantId: true,
            nome: true,
            nicho: true,
            botActive: true,
          },
        },
      },
    });

    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    return NextResponse.json({ usuario });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!verificarAdminSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { nome, sobrenome, email, telefone, role, ativo, acessoExpiraEm, novaSenha, emailVerificado } = body;

    const data: any = {};
    if (nome !== undefined) data.nome = nome;
    if (sobrenome !== undefined) data.sobrenome = sobrenome;
    if (email !== undefined) data.email = email;
    if (telefone !== undefined) data.telefone = telefone;
    if (role !== undefined) data.role = role;
    if (ativo !== undefined) data.ativo = ativo;
    if (emailVerificado !== undefined) data.emailVerificado = emailVerificado;
    if (acessoExpiraEm !== undefined) data.acessoExpiraEm = acessoExpiraEm ? new Date(acessoExpiraEm) : null;
    if (novaSenha) {
      data.senhaHash = await bcrypt.hash(novaSenha, 10);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const usuario = await prisma.usuario.update({ where: { id }, data });
    return NextResponse.json({ ok: true, usuario });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'E-mail já em uso' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!verificarAdminSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.notificacaoInterna.deleteMany({ where: { usuarioId: id } });
    await prisma.usuario.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
