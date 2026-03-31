import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET /api/appointments/hoje?data=2026-03-30&profissionalId=xxx
export async function GET(req: Request) {
  try {
    const { tenantId, role, profissionalId: myProfId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);

    const dataParam = searchParams.get('data') || new Date().toISOString().split('T')[0];
    const filtroProf = searchParams.get('profissionalId') || null;

    const inicio = new Date(dataParam + 'T00:00:00');
    const fim    = new Date(dataParam + 'T23:59:59');

    const where: any = {
      tenantId,
      dataHora: { gte: inicio, lte: fim },
    };

    // Profissional só vê os próprios
    if (role === 'profissional' && myProfId) {
      where.profissionalId = myProfId;
    } else if (filtroProf) {
      where.profissionalId = filtroProf;
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        paciente: { select: { id: true, nome: true, telefone: true, dataNascimento: true, convenio: true } },
        profissional: { select: { id: true, nome: true } },
        servico: { select: { id: true, nome: true, durationMinutes: true, price: true, color: true } },
      },
      orderBy: { dataHora: 'asc' },
    });

    // Totais por status
    const totais = agendamentos.reduce(
      (acc, a) => {
        const s = a.status as string;
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({ agendamentos, totais });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/appointments/hoje — atualizar status de um agendamento
export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { id, status, observacoes } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 });
    }

    const VALIDOS = ['pendente', 'confirmado', 'done', 'cancelado'];
    if (!VALIDOS.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const agendamento = await prisma.agendamento.findFirst({ where: { id, tenantId } });
    if (!agendamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: {
        status,
        ...(observacoes !== undefined ? { observacoes } : {}),
      },
      include: {
        paciente: { select: { id: true, nome: true, telefone: true } },
        profissional: { select: { id: true, nome: true } },
        servico: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json(atualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
