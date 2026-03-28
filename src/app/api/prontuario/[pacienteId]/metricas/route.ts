import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — série histórica de métricas para gráficos
export async function GET(_req: Request, { params }: { params: Promise<{ pacienteId: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = await params;

    // Busca as últimas 15 evoluções com métricas vitais
    const evolucoes = await prisma.prontuarioRegistro.findMany({
      where: {
        pacienteId, tenantId,
        OR: [
          { pressaoSistolica: { not: null } },
          { temperatura: { not: null } },
          { saturacao: { not: null } },
          { glicemia: { not: null } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 15,
      select: {
        id: true, createdAt: true,
        pressaoSistolica: true, pressaoDiastolica: true,
        temperatura: true, saturacao: true, glicemia: true,
      },
    });

    // Série de peso/IMC da MedidaCorporal
    const medidas = await prisma.medidaCorporal.findMany({
      where: { prontuario: { pacienteId, tenantId } },
      orderBy: { createdAt: 'asc' },
      take: 15,
      select: { id: true, createdAt: true, peso: true, imc: true },
    });

    return NextResponse.json({ vitais: evolucoes, medidas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
