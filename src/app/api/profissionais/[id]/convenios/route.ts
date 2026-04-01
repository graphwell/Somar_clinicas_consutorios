import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET /api/profissionais/[id]/convenios
// Retorna convênios aceitos pelo profissional
// Se nenhum configurado → aceita todos (regra de negócio)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const profissionalId = params.id;

    const vinculos = await prisma.profissionalConvenio.findMany({
      where: { profissionalId, tenantId, ativo: true },
      include: {
        convenio: { select: { id: true, nomeConvenio: true, codigo: true, ativo: true } },
      },
    });

    // Se sem vínculos → profissional aceita todos os convênios ativos do tenant
    if (vinculos.length === 0) {
      const todos = await prisma.convenioEmpresa.findMany({
        where: { tenantId, ativo: true },
        select: { id: true, nomeConvenio: true, codigo: true, ativo: true },
      });
      return NextResponse.json({ semConfiguracao: true, convenios: todos });
    }

    return NextResponse.json({
      semConfiguracao: false,
      convenios: vinculos.map((v) => v.convenio),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
