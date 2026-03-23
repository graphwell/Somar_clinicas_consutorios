import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const body = await request.json();
  const { tenantId, nomeConvenio, ativo } = body;

  try {
    const convenio = await prisma.convenioEmpresa.update({
      where: { id, tenantId },
      data: { nomeConvenio, ativo }
    });
    return NextResponse.json(convenio);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar convenio' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  try {
    // Soft delete ou Hard? Podemos fazer hard-delete se não tiver agendamentos ligados id a id.
    // Mas agendamento salva só a string (o nome). Então hard delete é seguro.
    await prisma.convenioEmpresa.delete({
      where: { id, tenantId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar convenio' }, { status: 500 });
  }
}
