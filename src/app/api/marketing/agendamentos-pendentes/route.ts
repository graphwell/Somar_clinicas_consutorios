import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

/** Agendamentos futuros que ainda não receberam lembrete */
export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const agora = new Date();
    const limite = new Date(agora.getTime() + 48 * 60 * 60 * 1000);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        dataHora: { gte: agora, lte: limite },
        status: { in: ['pendente', 'confirmado'] },
      },
      include: { paciente: true, servico: true, profissional: true },
      orderBy: { dataHora: 'asc' },
      take: 50,
    });

    // Verifica quais já receberam lembrete nas últimas 25h
    const janela = new Date(agora.getTime() - 25 * 60 * 60 * 1000);
    const jaEnviados = await prisma.marketingEnvio.findMany({
      where: {
        tenantId,
        tipo: 'lembrete',
        enviadoEm: { gte: janela },
      },
      select: { clienteTelefone: true },
    });
    const telefonesJaEnviados = new Set(jaEnviados.map(e => e.clienteTelefone));

    const result = agendamentos.map(ag => ({
      id: ag.id,
      dataHora: ag.dataHora,
      paciente: { nome: ag.paciente.nome, telefone: ag.paciente.telefone },
      servico: ag.servico?.nome ?? null,
      profissional: ag.profissional?.nome ?? null,
      lembreteEnviado: ag.paciente.telefone
        ? telefonesJaEnviados.has(ag.paciente.telefone)
        : false,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
