import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// Rota temporária de diagnóstico — /api/debug/agenda
export async function GET(req: Request) {
  try {
    const { tenantId, role } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const dataParam = searchParams.get('data') || new Date().toISOString().split('T')[0];
    const data = new Date(dataParam + 'T00:00:00');
    const diaSemana = data.getDay();

    const clinica = await prisma.clinica.findUnique({
      where: { id: tenantId },
      select: { nome: true, openingTime: true, closingTime: true, nicho: true },
    });

    const profissionais = await prisma.profissional.findMany({
      where: { tenantId },
      include: {
        escalas: { where: { ativo: true } },
        _count: { select: { agendamentos: true } },
      },
    });

    const report = {
      clinica,
      dataParam,
      diaSemana,
      role,
      totalProfissionais: profissionais.length,
      profissionaisAtivos: profissionais.filter(p => p.ativo).length,
      profissionaisSemEscala: profissionais.filter(p => p.escalas.length === 0).length,
      profissionais: profissionais.map(p => ({
        id: p.id,
        nome: p.nome,
        ativo: p.ativo,
        totalEscalas: p.escalas.length,
        escalasHoje: p.escalas.filter(e => e.diaSemana === diaSemana).length,
        escalas: p.escalas.map(e => ({
          diaSemana: e.diaSemana,
          horaInicio: e.horaInicio,
          horaFim: e.horaFim,
          lunchStart: e.lunchStart,
          lunchEnd: e.lunchEnd,
        })),
        totalAgendamentos: p._count.agendamentos,
      })),
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
