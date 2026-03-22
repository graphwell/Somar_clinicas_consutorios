import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  // Chamada pelo n8n via Cron Job (ex: todo dia às 08:00)
  // Retorna todos os agendamentos que ocorrerão nas próximas 24 horas a 48 horas
  
  const authHeader = request.headers.get('authorization');
  // Simulação de proteção simples para o bot
  if (authHeader !== 'Bearer CHAVE_SECRETA_N8N') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const amanhaInicio = new Date();
  amanhaInicio.setDate(amanhaInicio.getDate() + 1);
  amanhaInicio.setUTCHours(0, 0, 0, 0);

  const amanhaFim = new Date(amanhaInicio);
  amanhaFim.setUTCHours(23, 59, 59, 999);

  try {
    const lembretes = await prisma.agendamento.findMany({
      where: {
        dataHora: {
          gte: amanhaInicio,
          lte: amanhaFim
        },
        status: 'confirmado' // Só lembra se ainda estiver confirmado
      },
      include: {
        paciente: true,
        clinica: true
      }
    });

    return NextResponse.json({
      success: true,
      lembretes: lembretes.map(ag => ({
        id: ag.id,
        eventoId: ag.eventoId,
        dataHora: ag.dataHora,
        pacienteNome: ag.paciente.nome,
        pacienteTelefone: ag.paciente.telefone,
        clinicaNome: ag.clinica.nome,
        tenantId: ag.tenantId
      }))
    });
  } catch (error) {
    console.error("Erro ao buscar lembretes:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
