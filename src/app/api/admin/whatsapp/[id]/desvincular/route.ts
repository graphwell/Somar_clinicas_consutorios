import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, wasenderDelete, INSTANCE_SELECT } from '@/lib/wasender';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, sessionId: true, bearerToken: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  // Remover webhook no WasenderAPI
  await wasenderDelete(instancia.bearerToken, `/session/${instancia.sessionId}/webhook`);

  const atualizado = await prisma.whatsappInstance.update({
    where: { id: params.id },
    data: {
      empresaId: null,
      status: 'LIVRE',
      webhookUrl: null,
      conectadoEm: null,
      numeroWa: null,
    },
    select: INSTANCE_SELECT,
  });

  return NextResponse.json({ success: true, instancia: atualizado });
}
