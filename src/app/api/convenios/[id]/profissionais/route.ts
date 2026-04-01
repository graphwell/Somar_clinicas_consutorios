import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — profissionais vinculados ao convênio
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id: convenioId } = params;

    const vinculos = await prisma.profissionalConvenio.findMany({
      where: { convenioId, tenantId },
      include: {
        profissional: { select: { id: true, nome: true, especialidade: true, fotoUrl: true } },
      },
    });

    return NextResponse.json(vinculos.map((v) => ({ ...v.profissional, vinculoAtivo: v.ativo })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — vincular profissional ao convênio
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id: convenioId } = params;
    const { profissionalId } = await req.json();

    if (!profissionalId) {
      return NextResponse.json({ error: 'profissionalId é obrigatório.' }, { status: 400 });
    }

    const vinculo = await prisma.profissionalConvenio.upsert({
      where: { profissionalId_convenioId: { profissionalId, convenioId } },
      update: { ativo: true, tenantId },
      create: { profissionalId, convenioId, tenantId, ativo: true },
    });

    return NextResponse.json(vinculo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — desvincular profissional do convênio
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id: convenioId } = params;
    const { profissionalId } = await req.json();

    await prisma.profissionalConvenio.updateMany({
      where: { convenioId, profissionalId, tenantId },
      data: { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
