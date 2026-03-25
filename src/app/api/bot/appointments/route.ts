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
    
    // Tenta ler o corpo da requisição (JSON)
    let body: any = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.warn('Corpo da requisição não é um JSON válido ou está vazio');
    }

    const pacienteTelefone = body.pacienteTelefone || searchParams.get('pacienteTelefone');
    const pacienteNome     = body.pacienteNome     || body.nome || searchParams.get('pacienteNome') || searchParams.get('nome');
    const dataHora         = body.dataHora         || searchParams.get('dataHora');
    const profissionalId   = body.profissionalId   || searchParams.get('profissionalId');
    const servicoId        = body.servicoId        || searchParams.get('servicoId');
    const tipoAtendimento  = body.tipoAtendimento  || searchParams.get('tipoAtendimento') || 'particular';
    const convenio         = body.convenio         || searchParams.get('convenio');
    const observacoes      = body.observacoes      || searchParams.get('observacoes');

    let tenantId = body.tenantId || searchParams.get('tenantId');
    
    // Bios-healing: se não veio no body/query, busca da sessão
    if (!tenantId) {
      try {
        tenantId = await getAuthorizedTenantId();
      } catch (e) {
        console.error('TenantId não encontrado na sessão:', (e as Error).message);
      }
    }

    console.log('--- DEBUG AGENDAMENTO ---');
    console.log('Paciente:', pacienteNome, '(', pacienteTelefone, ')');
    console.log('Data:', dataHora);
    console.log('Tenant:', tenantId);
    console.log('-------------------------');

    if (!pacienteTelefone || !dataHora || !tenantId) {
      return NextResponse.json({ 
        error: 'Faltam parametros obrigatorios: pacienteTelefone, dataHora, tenantId',
        debug: { hasPhone: !!pacienteTelefone, hasDate: !!dataHora, hasTenant: !!tenantId }
      }, { status: 400 });
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
    const conflictingAppts = await prisma.agendamento.findMany({
      where: { 
        tenantId, 
        status: { in: ['confirmado', 'pendente'] },
        profissionalId: profissionalId || null,
        dataHora: {
          gte: new Date(date.getTime() - 240 * 60000), 
          lte: new Date(date.getTime() + 240 * 60000)
        }
      },
      include: { servico: true }
    });

    for (const a of conflictingAppts) {
      const aStart = new Date(a.dataHora);
      const aDuration = a.durationMinutes || (a.servico?.duracaoMinutos ?? 30);
      const aBuffer = a.servico?.bufferTimeMinutes ?? 0;
      const aEndWithBuffer = new Date(aStart.getTime() + (aDuration + aBuffer) * 60000);

      if (date >= aStart && date < aEndWithBuffer) {
        return NextResponse.json({ success: false, error: 'Horário bloqueado por agendamento ou intervalo (buffer)' }, { status: 409 });
      }
      
      if (fimDataHora > aStart && date < aStart) {
          return NextResponse.json({ success: false, error: 'O agendamento invade o próximo horário ocupado.' }, { status: 409 });
      }
    }

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
        observacoes: observacoes || ''
      }
    });

    // Upsell
    let upsellData = null;
    try {
      const combosAtivos = await prisma.comboUpsell.findFirst({
        where: { tenantId, ativo: true },
        include: { oferta: true }
      });
      if (combosAtivos && combosAtivos.oferta) {
        upsellData = { oferecer: true, texto: combosAtivos.descricaoOferta, servicoId: combosAtivos.oferta.id };
      }
    } catch (e) {}

    // Automação Financeira
    if (servicoId) {
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

  } catch (err: any) {
    console.error('Erro ao criar agendamento:', err);
    return NextResponse.json({ 
      error: 'Erro interno ao criar agendamento', 
      details: err.message 
    }, { status: 500 });
  }
}
