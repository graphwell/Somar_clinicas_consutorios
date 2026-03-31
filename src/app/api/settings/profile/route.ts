import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET /api/settings/profile — dados do usuário atual
export async function GET() {
  try {
    const { userId } = await getSessionInfo();
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, sobrenome: true, telefone: true, email: true, role: true, avatarUrl: true },
    });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings/profile — atualiza nome do usuário
export async function PUT(request: Request) {
  try {
    const { userId } = await getSessionInfo();
    const { nome, telefone } = await request.json();
    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }
    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        nome: nome.trim(),
        telefone: telefone ? telefone.replace(/\D/g, '') : null,
      },
      select: { id: true, nome: true, sobrenome: true, telefone: true, email: true, role: true, avatarUrl: true },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
