import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const body = await request.json();
  const { tenantId, nome, especialidade, registroProfissional, bio, fotoUrl, color, horariosJson, ativo } = body;

  try {
    // @ts-ignore
    const prof = await prisma.profissional.update({
      where: { id, tenantId }, // tenantId garante que só a clinica dona altera
      data: { nome, especialidade, registroProfissional, bio, fotoUrl, color, horariosJson, ativo }
    });
    return NextResponse.json(prof);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar profissional' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  try {
    // Soft delete ou Hard delete? Se tiver agendamentos ligados, hard delete falhará
    // Vamos fazer soft delete:
    // @ts-ignore
    const prof = await prisma.profissional.update({
      where: { id, tenantId },
      data: { ativo: false }
    });
    return NextResponse.json({ success: true, prof });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar/desativar profissional' }, { status: 500 });
  }
}
