import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — status rápido da ficha (para uso no modal de agendamento)
export async function GET(
  _req: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = params;

    const ficha = await prisma.fichaCliente.findUnique({
      where: { pacienteId },
      select: {
        id: true,
        alertas: true,
        estiloPreferido: true,
        maquinaNumero: true,
        barbaEstilo: true,
        produtosFavoritos: true,
        tipoCabelo: true,
        porosidade: true,
        coloracaoAtual: true,
        tipoPele: true,
        fitzpatrick: true,
        alergiasSubstancias: true,
        medicamentosUso: true,
        observacoesGerais: true,
        profissionalPreferidoId: true,
      },
    });

    const totalVisitas = await prisma.visitaCliente.count({
      where: { pacienteId, tenantId },
    });

    // Ficha preenchida = pelo menos 1 campo além do id tem valor
    const fichaPreenchida = ficha
      ? Object.entries(ficha)
          .filter(([k]) => k !== 'id')
          .some(([, v]) => v !== null && v !== undefined && v !== '')
      : false;

    return NextResponse.json({
      fichaId: ficha?.id ?? null,
      fichaPreenchida,
      totalVisitas,
      alertas: ficha?.alertas ?? null,
      resumo: ficha ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
