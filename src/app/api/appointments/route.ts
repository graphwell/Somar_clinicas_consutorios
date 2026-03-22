import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateEventoId } from '@/lib/utils-saas';

async function getAuth(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { pacienteId, dataHora } = await request.json();
    const date = new Date(dataHora);
    const tenantId = auth.tenantId;

    // Geração do evento_id híbrido para idempotência
    const eventoId = generateEventoId(pacienteId, date, tenantId);

    // Conflict Check: Verifica se já existe agendamento no mesmo horário para este tenant
    const conflict = await prisma.agendamento.findFirst({
      where: {
        dataHora: date,
        tenantId,
        status: { not: 'cancelado' }
      }
    });

    if (conflict) {
      return NextResponse.json({ 
        error: 'Conflito de horário! Já existe um agendamento para este momento.' 
      }, { status: 409 });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        pacienteId,
        dataHora: date,
        tenantId,
        eventoId,
        status: 'pendente',
      },
      include: { paciente: true }
    });

    // Gatilho para n8n de automação WhatsApp
    const n8nWebhook = "https://n8n.somar.ia.br/webhook/entrada-leads";
    fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...agendamento,
        tipo: 'NOVO_AGENDAMENTO',
        webhookUrl: `https://n8n.somar.ia.br/webhook/confirmacao?id=${agendamento.id}`
      })
    }).catch(console.error);

    return NextResponse.json(agendamento);

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Agendamento duplicado (ID Híbrido detectado)' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao processar agendamento' }, { status: 500 });
  }
}
