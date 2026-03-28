import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — lista especialidades com seus profissionais e contagem de serviços
export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const profissionais = await prisma.profissional.findMany({
      where: { tenantId },
      include: {
        servicos: { select: { id: true, nome: true } },
        _count: { select: { agendamentos: true } },
      },
      orderBy: { nome: 'asc' },
    });

    // Agrupa por especialidade
    const map: Record<string, {
      especialidade: string;
      profissionais: typeof profissionais;
      totalAgendamentos: number;
    }> = {};

    for (const p of profissionais) {
      const key = p.especialidade?.trim() || 'Geral';
      if (!map[key]) {
        map[key] = { especialidade: key, profissionais: [], totalAgendamentos: 0 };
      }
      map[key].profissionais.push(p);
      map[key].totalAgendamentos += p._count.agendamentos;
    }

    const especialidades = Object.values(map).sort((a, b) => {
      if (a.especialidade === 'Geral') return 1;
      if (b.especialidade === 'Geral') return -1;
      return a.especialidade.localeCompare(b.especialidade, 'pt-BR');
    });

    return NextResponse.json(especialidades);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
