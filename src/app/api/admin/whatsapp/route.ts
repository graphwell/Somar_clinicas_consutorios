import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, INSTANCE_SELECT } from '@/lib/wasender';

export async function GET(request: Request) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as any;
  const plataforma = searchParams.get('plataforma') as any;

  const instancias = await prisma.whatsappInstance.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(plataforma ? { plataforma } : {}),
    },
    select: INSTANCE_SELECT,
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json({ success: true, instancias });
}

export async function POST(request: Request) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const body = await request.json();
  const { sessionId, bearerToken, plataforma, observacoes, status } = body;

  if (!sessionId || !bearerToken) {
    return NextResponse.json({ error: 'sessionId e bearerToken são obrigatórios' }, { status: 400 });
  }

  const statusValidos = ['LIVRE', 'DEMO', 'EM_USO', 'OFFLINE', 'AGUARDANDO'];
  const statusFinal = statusValidos.includes(status) ? status : 'LIVRE';

  const jaExiste = await prisma.whatsappInstance.findUnique({ where: { sessionId }, select: { id: true } });
  if (jaExiste) {
    return NextResponse.json({ error: 'sessionId já cadastrado' }, { status: 409 });
  }

  const instancia = await prisma.whatsappInstance.create({
    data: {
      sessionId,
      bearerToken,
      plataforma: plataforma || 'WASENDERAPI',
      observacoes: observacoes || null,
      status: statusFinal,
    },
    select: INSTANCE_SELECT,
  });

  return NextResponse.json({ success: true, instancia }, { status: 201 });
}
