import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// POST /api/upload/avatar — salva avatar do usuário como base64
export async function POST(request: Request) {
  try {
    const { userId } = await getSessionInfo();
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório.' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG ou WebP.' }, { status: 400 });
    }
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 1MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(new Uint8Array(bytes)).toString('base64');
    const avatarUrl = `data:${file.type};base64,${base64}`;

    await prisma.usuario.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
