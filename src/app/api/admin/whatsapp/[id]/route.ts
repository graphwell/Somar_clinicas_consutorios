import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, INSTANCE_SELECT } from '@/lib/wasender';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

  if (instancia.status !== 'LIVRE') {
    return NextResponse.json(
      { error: 'Só é possível remover instâncias com status LIVRE. Desvincule antes de remover.' },
      { status: 409 }
    );
  }

  // Soft delete: marcar como OFFLINE e limpar sessionId seria destrutivo —
  // mantemos o registro mas sinalizamos com OFFLINE como estado final.
  // Para exclusão física, a equipe Synka acessa o banco diretamente.
  await prisma.whatsappInstance.update({
    where: { id: params.id },
    data: { status: 'OFFLINE', observacoes: `Removido em ${new Date().toISOString()}` },
  });

  return NextResponse.json({ success: true, mensagem: 'Instância marcada como removida' });
}
