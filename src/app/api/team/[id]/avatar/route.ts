import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  let session: Awaited<ReturnType<typeof getSessionInfo>>;
  try {
    session = await getSessionInfo();
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Verificar que o profissional pertence ao tenant do usuário
  const profissional = await prisma.profissional.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });

  if (!profissional) {
    return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  }

  const file = formData.get('avatar') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. Máximo: ${MAX_BYTES / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Formato inválido. Use JPEG, PNG ou WebP.' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const fotoUrl = `data:${file.type};base64,${base64}`;

    await prisma.profissional.update({
      where: { id },
      data: { fotoUrl },
    });

    return NextResponse.json({ fotoUrl });
  } catch (err) {
    console.error('[team/avatar POST]', err);
    return NextResponse.json({ error: 'Erro interno ao salvar foto' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  let session: Awaited<ReturnType<typeof getSessionInfo>>;
  try {
    session = await getSessionInfo();
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const profissional = await prisma.profissional.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true },
  });

  if (!profissional) {
    return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 });
  }

  try {
    await prisma.profissional.update({
      where: { id },
      data: { fotoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[team/avatar DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
