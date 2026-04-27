import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET — regras de um profissional específico
export async function GET(
  _req: NextRequest,
  { params }: { params: { profissionalId: string } },
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { profissionalId } = params;

    const prof = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: {
        id:                true,
        nome:              true,
        percentualRepasse: true,
        repasseFixo:       true,
        repasseTipo:       true,
        comissaoRegras: {
          where:   { ativo: true },
          orderBy: { tipoBase: 'asc' },
        },
      },
    });

    if (!prof) {
      return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 });
    }

    // Agrupar por tipoBase para facilitar o consumo no front-end
    const regrasPorTipo: Record<string, typeof prof.comissaoRegras> = {};
    for (const r of prof.comissaoRegras) {
      if (!regrasPorTipo[r.tipoBase]) regrasPorTipo[r.tipoBase] = [];
      regrasPorTipo[r.tipoBase].push(r);
    }

    return NextResponse.json({ ...prof, regrasPorTipo });
  } catch (err) {
    console.error('[settings/comissoes/:id GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
