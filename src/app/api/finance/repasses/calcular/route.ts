import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { tenantId, role } = await getSessionInfo();
    if (role === 'profissional') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
    }

    const { periodo } = await req.json();
    if (!periodo) return NextResponse.json({ error: 'periodo obrigatório (ex: 2026-03)' }, { status: 400 });

    const [ano, mes] = periodo.split('-').map(Number);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59, 999);

    // Buscar profissionais ativos com configuração de repasse
    const profissionais = await prisma.profissional.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, nome: true, especialidade: true, percentualRepasse: true, repasseFixo: true, repasseTipo: true },
    });

    // Buscar agendamentos concluídos no período por profissional
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        dataHora: { gte: inicio, lte: fim },
        status: { in: ['concluido', 'done', 'realizado'] },
        profissionalId: { not: null },
      },
      include: { servico: { select: { preco: true } } },
    });

    const resultados = [];

    for (const prof of profissionais) {
      const ags = agendamentos.filter((a) => a.profissionalId === prof.id);
      if (ags.length === 0) continue;

      const totalBruto = ags.reduce((s, a) => s + (a.servico?.preco || 0), 0);
      const percentual = prof.percentualRepasse || 0;
      let totalRepasse = 0;

      if (prof.repasseTipo === 'fixo') {
        totalRepasse = prof.repasseFixo || 0;
      } else {
        totalRepasse = (totalBruto * percentual) / 100;
      }

      const repasse = await prisma.repasseProfissional.upsert({
        where: { tenantId_profissionalId_periodo: { tenantId, profissionalId: prof.id, periodo } },
        update: { totalBruto, percentual, totalRepasse },
        create: {
          tenantId,
          profissionalId: prof.id,
          periodo,
          totalBruto,
          percentual,
          totalRepasse,
          status: 'pendente',
        },
      });

      resultados.push({ ...repasse, profissional: prof });
    }

    return NextResponse.json({ ok: true, repasses: resultados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
