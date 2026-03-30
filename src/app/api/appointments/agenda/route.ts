import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { tenantId, role, profissionalId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);

    const dataParam = searchParams.get('data') || new Date().toISOString().split('T')[0];
    const data = new Date(dataParam + 'T00:00:00');
    const fimDia = new Date(dataParam + 'T23:59:59');

    // Dia da semana: 0=Dom, 1=Seg, ..., 6=Sáb
    const diaSemana = data.getDay();

    // Profissionais (se role=profissional, retornar só o próprio)
    const whereProf: any = { tenantId, ativo: true };
    if (role === 'profissional' && profissionalId) {
      whereProf.id = profissionalId;
    }

    const profissionais = await prisma.profissional.findMany({
      where: whereProf,
      include: {
        escalas: { where: { diaSemana, ativo: true } },
        agendamentos: {
          where: {
            tenantId,
            dataHora: { gte: data, lte: fimDia },
            status: { not: 'cancelado' },
          },
          include: {
            paciente: { select: { nome: true, telefone: true } },
            servico: { select: { nome: true, color: true } },
          },
          orderBy: { dataHora: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    });

    const result = profissionais.map((prof) => {
      const escala = prof.escalas[0] || null;
      const horarioInicio = escala?.horaInicio ?? '08:00';
      const horarioFim    = escala?.horaFim    ?? '18:00';
      const lunchStart    = escala?.lunchStart  ?? null;
      const lunchEnd      = escala?.lunchEnd    ?? null;

      const agendamentos = prof.agendamentos.map((ag) => ({
        id: ag.id,
        pacienteNome:     ag.paciente.nome,
        pacienteTelefone: ag.paciente.telefone,
        dataHora:         ag.dataHora.toISOString(),
        fimDataHora:      ag.fimDataHora.toISOString(),
        durationMinutes:  ag.durationMinutes,
        status:           ag.status,
        servico:          ag.servico ? { nome: ag.servico.nome, color: ag.servico.color } : null,
        convenio:         ag.convenio,
        observacoes:      ag.observacoes,
      }));

      const totalSlots = escala
        ? Math.floor(
            (parseInt(horarioFim.replace(':', '')) -
              parseInt(horarioInicio.replace(':', ''))) /
              50  // ~30min slots por hora
          )
        : 0;

      return {
        id:            prof.id,
        nome:          prof.nome,
        especialidade: prof.especialidade,
        color:         prof.color || '#4a4ae2',
        fotoUrl:       prof.fotoUrl,
        horarioInicio,
        horarioFim,
        lunchStart,
        lunchEnd,
        trabalhaNoDia:   !!escala,
        agendamentos,
        slotsOcupados:   agendamentos.length,
        slotsLivres:     Math.max(0, totalSlots - agendamentos.length),
      };
    });

    return NextResponse.json({ data: dataParam, profissionais: result });
  } catch (error: any) {
    console.error('Erro na agenda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
