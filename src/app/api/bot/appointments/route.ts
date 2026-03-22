import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEventoId } from '@/lib/utils-saas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const tenantId = searchParams.get('tenantId');

  if (!phone || !tenantId) return NextResponse.json({ error: 'Faltam parametros' }, { status: 400 });

  const appointments = await prisma.agendamento.findMany({
    where: { 
      tenantId, 
      paciente: { telefone: phone },
      dataHora: { gte: new Date() },
      status: { not: 'cancelado' }
    },
    include: { paciente: true }
  });

  return NextResponse.json({ success: true, appointments });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { pacienteTelefone, pacienteNome, dataHora, tenantId } = body;

  let paciente = await prisma.paciente.findFirst({
    where: { telefone: pacienteTelefone, tenantId }
  });

  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: { nome: pacienteNome || 'Paciente WhatsApp', telefone: pacienteTelefone, tenantId }
    });
  }

  const date = new Date(dataHora);
  const eventoId = generateEventoId(paciente.id, date, tenantId);

  const conflict = await prisma.agendamento.findFirst({
    where: { dataHora: date, tenantId, status: { not: 'cancelado' } }
  });

  if (conflict) {
    return NextResponse.json({ success: false, error: 'Horário já ocupado' }, { status: 409 });
  }

  const agendamento = await prisma.agendamento.create({
    data: { pacienteId: paciente.id, dataHora: date, tenantId, eventoId, status: 'confirmado' }
  });

  return NextResponse.json({ success: true, agendamento });
}

