import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

/** Estima o alcance de uma campanha antes de disparar */
export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { tipo, filtroServico, filtroInativoDias } = await req.json();

    const base = { tenantId, deletedAt: null, telefone: { not: null } } as any;

    if (tipo === 'aniversariantes') {
      const todos = await prisma.paciente.findMany({ where: { ...base, dataNascimento: { not: null } } });
      const hoje = new Date();
      const count = todos.filter(p => {
        const d = new Date(p.dataNascimento!);
        return d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
      }).length;
      return NextResponse.json({ total: count });
    }

    if (tipo === 'inativos') {
      const dias = filtroInativoDias ?? 30;
      const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
      const count = await prisma.paciente.count({
        where: { ...base, OR: [{ ultimaVisita: { lt: cutoff } }, { ultimaVisita: null }] },
      });
      return NextResponse.json({ total: count });
    }

    if (tipo === 'servico' && filtroServico) {
      const agendamentos = await prisma.agendamento.findMany({
        where: { tenantId, servico: { nome: { equals: filtroServico, mode: 'insensitive' } } },
        select: { pacienteId: true },
        distinct: ['pacienteId'],
      });
      return NextResponse.json({ total: agendamentos.length });
    }

    // todos
    const count = await prisma.paciente.count({ where: base });
    return NextResponse.json({ total: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
