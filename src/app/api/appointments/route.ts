import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();

    const appointments = await prisma.agendamento.findMany({
      where: { tenantId },
      include: { 
        paciente: { select: { nome: true, telefone: true } },
        servico: true,
        profissional: { select: { id: true, nome: true } }
      },
      orderBy: { dataHora: 'desc' },
      take: 100,
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();
    const body = await request.json();
    
    // Suporte a ambos os formatos de body (direto ou via bot)
    const { 
      pacienteId, profissionalId, servicoId, dataHora, 
      status, tipoAtendimento, convenio, observacoes, 
      durationMinutes, categoria 
    } = body;

    if (!pacienteId || !dataHora) {
      return NextResponse.json({ error: 'Paciente e data/hora são obrigatórios' }, { status: 400 });
    }

    const start = new Date(dataHora);
    const duration = durationMinutes || 30;
    const end = new Date(start.getTime() + duration * 60000);

    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        pacienteId,
        profissionalId: profissionalId || null,
        servicoId: servicoId || null,
        dataHora: start,
        fimDataHora: end,
        durationMinutes: duration,
        status: status || 'pendente',
        tipoAtendimento: tipoAtendimento || 'particular',
        convenio: convenio || null,
        observacoes: observacoes || '',
        // @ts-ignore
        categoria: categoria || 'consulta',
        eventoId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      },
      include: {
        paciente: { select: { nome: true } },
        profissional: { select: { nome: true } },
        servico: { select: { nome: true } }
      }
    });

    return NextResponse.json(agendamento);
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}
