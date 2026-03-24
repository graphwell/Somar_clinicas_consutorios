import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEventoId } from '@/lib/utils-saas';
import { createFinancialTransaction } from '@/lib/financial-automation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const tenantId = searchParams.get('tenantId');

  if (!phone || !tenantId) return NextResponse.json({ error: 'Faltam parametros' }, { status: 400 });

  try {
    // @ts-ignore
    const appointments = await prisma.agendamento.findMany({
      where: { 
        tenantId, 
        paciente: { telefone: phone },
        dataHora: { gte: new Date() },
        status: { not: 'cancelado' }
      },
      include: { 
        paciente: true, 
        profissional: true,
        servico: true
      }
    });

    return NextResponse.json({ success: true, appointments });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
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
  const profissionalId   = searchParams.get('profissionalId') || body.profissionalId;
  const servicoId        = searchParams.get('servicoId') || body.servicoId;

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
  const eventoId = generateEventoId(paciente.id, date, tenantId, profissionalId);

  // Anti-oscilação: Verifica se ESTE paciente já tem agendamento neste exato horário
  const duplicado = await prisma.agendamento.findUnique({
    where: { eventoId }
  });
  if (duplicado) {
    return NextResponse.json({ success: true, agendamento: duplicado, message: 'Agendamento já existia' });
  }

  // Verifica se o horário está ocupado por OUTRA pessoa
  const conflictWhere: any = { dataHora: date, tenantId, status: { not: 'cancelado' } };
  if (profissionalId) conflictWhere.profissionalId = profissionalId;

  const conflict = await prisma.agendamento.findFirst({
    where: conflictWhere
  });

  if (conflict) {
    return NextResponse.json({ success: false, error: 'Horário já ocupado' }, { status: 409 });
  }

  // @ts-ignore
  const agendamento = await prisma.agendamento.create({
    data: { 
      pacienteId: paciente.id, 
      dataHora: date, 
      tenantId, 
      eventoId, 
      status: 'pendente',
      profissionalId: profissionalId || null,
      servicoId: servicoId || null
    }
  });

  // Módulo 8: Lógica Integrada de Upsell Automático
  let upsellData = null;
  try {
    // @ts-ignore
    const combosAtivos = await prisma.comboUpsell.findFirst({
      where: { tenantId, ativo: true },
      include: { oferta: true, gatilho: true }
    });
    
    if (combosAtivos && combosAtivos.oferta) {
      upsellData = {
        oferecer: true,
        texto: combosAtivos.descricaoOferta,
        servicoId: combosAtivos.oferta.id,
        desconto: combosAtivos.desconto
      };
    }
  } catch (e) {
    console.error('Erro ao buscar upsell:', e);
  }

  // V2: Automação Financeira
  if (servicoId) {
    // @ts-ignore
    const s = await prisma.servico.findUnique({ where: { id: servicoId } });
    if (s && s.preco > 0) {
      await createFinancialTransaction(agendamento.id, tenantId, s.preco);
    }
  }

  return NextResponse.json({ 
    success: true, 
    agendamento,
    upsellSugestao: upsellData
  });
}
