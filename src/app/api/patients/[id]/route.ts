import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const prisma = getTenantPrisma();
    const paciente = await prisma.paciente.findFirst({
      where: { id: params.id, tenantId },
      include: {
        _count: { select: { agendamentos: true } },
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          take: 10,
          include: { servico: { select: { nome: true } } },
        },
      },
    });
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }
    return NextResponse.json(paciente);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const prisma = getTenantPrisma();
    const body = await req.json();

    const existente = await prisma.paciente.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existente) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const updated = await prisma.paciente.update({
      where: { id: params.id },
      data: {
        nome:             body.nome             !== undefined ? body.nome             : existente.nome,
        telefone:         body.telefone         !== undefined ? body.telefone         : existente.telefone,
        dataNascimento:   body.dataNascimento   !== undefined ? (body.dataNascimento ? new Date(body.dataNascimento) : null) : existente.dataNascimento,
        convenio:         body.convenio         !== undefined ? body.convenio         : existente.convenio,
        tipoAtendimento:  body.tipoAtendimento  !== undefined ? body.tipoAtendimento  : existente.tipoAtendimento,
        // @ts-ignore
        carteirinha:      body.carteirinha      !== undefined ? body.carteirinha      : existente.carteirinha,
        // @ts-ignore
        validadeConvenio: body.validadeConvenio !== undefined ? body.validadeConvenio : existente.validadeConvenio,
        // @ts-ignore
        titularConvenio:  body.titularConvenio  !== undefined ? body.titularConvenio  : existente.titularConvenio,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
