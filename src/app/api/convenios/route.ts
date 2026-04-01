import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — lista convênios com stats
export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const convenios = await prisma.convenioEmpresa.findMany({
      where: { tenantId },
      include: {
        profissionais: {
          where: { ativo: true },
          include: { profissional: { select: { id: true, nome: true, especialidade: true } } },
        },
        tabelaPrecos: { where: { ativo: true } },
        _count: { select: { profissionais: true, tabelaPrecos: true } },
      },
      orderBy: { nomeConvenio: 'asc' },
    });

    // Contar pacientes por convênio (pelo campo convenio string)
    const pacientesCount = await prisma.paciente.groupBy({
      by: ['convenio'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
    });
    const pacientesPorConvenio = Object.fromEntries(
      pacientesCount.map((r) => [r.convenio ?? '', r._count.id])
    );

    const result = convenios.map((c) => ({
      id: c.id,
      nomeConvenio: c.nomeConvenio,
      codigo: c.codigo,
      telefone: c.telefone,
      site: c.site,
      observacoes: c.observacoes,
      logoUrl: c.logoUrl,
      ativo: c.ativo,
      totalProfissionais: c._count.profissionais,
      totalServicos: c._count.tabelaPrecos,
      totalPacientes: pacientesPorConvenio[c.nomeConvenio] ?? 0,
      profissionais: c.profissionais.map((pv) => pv.profissional),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/convenios]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — criar convênio
export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { nomeConvenio, codigo, telefone, site, observacoes } = await req.json();

    if (!nomeConvenio?.trim()) {
      return NextResponse.json({ error: 'Nome do convênio é obrigatório.' }, { status: 400 });
    }

    const existente = await prisma.convenioEmpresa.findFirst({
      where: { tenantId, nomeConvenio: nomeConvenio.trim() },
    });
    if (existente) {
      return NextResponse.json({ error: 'Já existe um convênio com este nome.' }, { status: 409 });
    }

    const convenio = await prisma.convenioEmpresa.create({
      data: {
        tenantId,
        nomeConvenio: nomeConvenio.trim(),
        codigo: codigo?.trim() || null,
        telefone: telefone?.trim() || null,
        site: site?.trim() || null,
        observacoes: observacoes?.trim() || null,
      },
    });

    return NextResponse.json(convenio, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
