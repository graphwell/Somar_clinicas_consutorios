import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
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
  try {
    const { searchParams } = new URL(request.url);
    
    // Accept params from both query string (n8n placeholders) and JSON body
    let body: any = {};
    try { body = await request.json(); } catch { /* body may be empty */ }

  const pacienteTelefone = searchParams.get('pacienteTelefone') || body.pacienteTelefone;
  const pacienteNome     = searchParams.get('nome') || searchParams.get('pacienteNome') || body.pacienteNome;
  const dataHora         = searchParams.get('dataHora') || body.dataHora;
  let tenantId = searchParams.get('tenantId') || body.tenantId;
  
  if (!tenantId) {
    try {
      tenantId = await getAuthorizedTenantId();
    } catch (e) {
      // Se não houver session (ex: bot n8n), o tenantId deve vir via param
    }
  }
  const profissionalId   = searchParams.get('profissionalId') || body.profissionalId;
  const servicoId        = searchParams.get('servicoId') || body.servicoId;
  const tipoAtendimento   = searchParams.get('tipoAtendimento') || body.tipoAtendimento || 'particular';
  const convenio         = searchParams.get('convenio') || body.convenio;
  const observacoes      = searchParams.get('observacoes') || body.observacoes;

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

  // Busca o serviço para pegar duração e buffer
  let duration = 30;
  let buffer = 0;
  if (servicoId) {
    const s = await prisma.servico.findUnique({ where: { id: servicoId } });
    if (s) {
      duration = s.duracaoMinutos || 30;
      buffer = s.bufferTimeMinutes || 0;
    }
  }

  const fimDataHora = new Date(date.getTime() + duration * 60000);

  // Anti-oscilação: Verifica se ESTE paciente já tem agendamento neste exato horário
  const duplicado = await prisma.agendamento.findUnique({
    where: { eventoId }
  });
  if (duplicado) {
    if (duplicado.status !== 'cancelado') {
      return NextResponse.json({ success: true, agendamento: duplicado, message: 'Agendamento já existia' });
    }
  }

  // VALIDAÇÃO DE CONFLITO EXPERT (V2.6)
  // Regra: novo_inicio NÃO pode estar entre [inicio_existente, fim_existente + buffer]
  const conflictingAppts = await prisma.agendamento.findMany({
    where: { 
      tenantId, 
      status: { in: ['confirmado', 'pendente'] },
      profissionalId: profissionalId || null,
      dataHora: {
        gte: new Date(date.getTime() - 240 * 60000), // Olhar 4 horas atrás
        lte: new Date(date.getTime() + 240 * 60000)  // Olhar 4 horas à frente
      }
    },
    include: { servico: true }
  });

  for (const a of conflictingAppts) {
    const aStart = new Date(a.dataHora);
    const aDuration = a.durationMinutes || (a.servico?.duracaoMinutos ?? 30);
    const aBuffer = a.servico?.bufferTimeMinutes ?? 0;
    const aEndWithBuffer = new Date(aStart.getTime() + (aDuration + aBuffer) * 60000);

    // Se o novo início estiver dentro do bloco [existente_inicio, existente_fim + buffer]
    if (date >= aStart && date < aEndWithBuffer) {
      await prisma.notificacao.create({
        data: {
          tenantId,
          titulo: '⚠️ Conflito de Agendamento',
          mensagem: `Conflito (Buffer): ${pacienteNome} às ${date.toLocaleTimeString()}. O horário está bloqueado pelo agendamento de ${aStart.toLocaleTimeString()} (+${aDuration}m +${aBuffer}m buffer).`
        }
      });
      return NextResponse.json({ success: false, error: 'Horário bloqueado por agendamento ou intervalo (buffer)' }, { status: 409 });
    }
    
    // Check if new appointment ends after an existing one starts
    if (fimDataHora > aStart && date < aStart) {
        return NextResponse.json({ success: false, error: 'O agendamento invade o próximo horário ocupado.' }, { status: 409 });
    }
  }

  // @ts-ignore
  const agendamento = await prisma.agendamento.create({
    data: { 
      pacienteId: paciente.id, 
      dataHora: date, 
      fimDataHora,
      durationMinutes: duration,
      tenantId, 
      eventoId, 
      status: 'pendente',
      profissionalId: profissionalId || null,
      servicoId: servicoId || null,
      tipoAtendimento,
      convenio,
      observacoes
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

  } catch (err: any) {
    console.error('Erro ao criar agendamento:', err);
    return NextResponse.json({ 
      error: 'Erro ao criar agendamento', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
