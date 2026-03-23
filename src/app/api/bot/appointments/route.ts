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
  const { searchParams } = new URL(request.url);
  
  // Accept params from both query string (n8n placeholders) and JSON body
  let body: any = {};
  try { body = await request.json(); } catch { /* body may be empty */ }

  const pacienteTelefone = searchParams.get('pacienteTelefone') || body.pacienteTelefone;
  const pacienteNome     = searchParams.get('nome') || searchParams.get('pacienteNome') || body.pacienteNome;
  const dataHora         = searchParams.get('dataHora') || body.dataHora;
  const tenantId         = searchParams.get('tenantId') || body.tenantId;

  if (!pacienteTelefone || !dataHora || !tenantId) {
    return NextResponse.json({ error: 'Faltam parametros obrigatorios: pacienteTelefone, dataHora, tenantId' }, { status: 400 });
  }

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

