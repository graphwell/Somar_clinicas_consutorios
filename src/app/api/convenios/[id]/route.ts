import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// PATCH — atualizar convênio
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id } = params;
    const body = await req.json();

    const existente = await prisma.convenioEmpresa.findFirst({
      where: { id, tenantId },
    });
    if (!existente) {
      return NextResponse.json({ error: 'Convênio não encontrado.' }, { status: 404 });
    }

    const updated = await prisma.convenioEmpresa.update({
      where: { id },
      data: {
        nomeConvenio: body.nomeConvenio?.trim() ?? existente.nomeConvenio,
        codigo: body.codigo !== undefined ? body.codigo?.trim() || null : existente.codigo,
        telefone: body.telefone !== undefined ? body.telefone?.trim() || null : existente.telefone,
        site: body.site !== undefined ? body.site?.trim() || null : existente.site,
        observacoes: body.observacoes !== undefined ? body.observacoes?.trim() || null : existente.observacoes,
        ativo: body.ativo !== undefined ? body.ativo : existente.ativo,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — soft delete (ativo: false)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id } = params;

    const existente = await prisma.convenioEmpresa.findFirst({
      where: { id, tenantId },
    });
    if (!existente) {
      return NextResponse.json({ error: 'Convênio não encontrado.' }, { status: 404 });
    }

    await prisma.convenioEmpresa.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
