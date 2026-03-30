import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { tenantId, role, profissionalId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);

    // Range da semana
    const inicioParam = searchParams.get('inicio');
    const fimParam    = searchParams.get('fim');

    const hoje = new Date();
    const inicio = inicioParam
      ? new Date(inicioParam + 'T00:00:00')
      : (() => {
          const d = new Date(hoje);
          d.setDate(hoje.getDate() - hoje.getDay() + 1); // Segunda
          d.setHours(0, 0, 0, 0);
          return d;
        })();
    const fim = fimParam
      ? new Date(fimParam + 'T23:59:59')
      : (() => {
          const d = new Date(inicio);
          d.setDate(inicio.getDate() + 6); // Domingo
          d.setHours(23, 59, 59, 999);
          return d;
        })();

    const whereProf: any = { tenantId, ativo: true };
    if (role === 'profissional' && profissionalId) {
      whereProf.id = profissionalId;
    }

    const profissionais = await prisma.profissional.findMany({
      where: whereProf,
      include: {
        escalas: { where: { ativo: true } },
        agendamentos: {
          where: {
            tenantId,
            dataHora: { gte: inicio, lte: fim },
            status:   { not: 'cancelado' },
          },
          include: {
            paciente: { select: { nome: true } },
            servico:  { select: { nome: true, color: true } },
          },
          orderBy: { dataHora: 'asc' },
        },
      },
    });

    // Agrupar por dia
    const dias: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      dias[d.toISOString().split('T')[0]] = [];
    }

    for (const prof of profissionais) {
      for (const ag of prof.agendamentos) {
        const key = ag.dataHora.toISOString().split('T')[0];
        if (dias[key]) {
          dias[key].push({
            ...ag,
            dataHora:    ag.dataHora.toISOString(),
            fimDataHora: ag.fimDataHora.toISOString(),
            profissionalNome:  prof.nome,
            profissionalColor: prof.color || '#4a4ae2',
            pacienteNome: ag.paciente.nome,
            servico:      ag.servico,
          });
        }
      }
    }

    return NextResponse.json({
      inicio: inicio.toISOString().split('T')[0],
      fim:    fim.toISOString().split('T')[0],
      dias,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
