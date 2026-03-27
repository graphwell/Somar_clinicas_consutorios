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
    const pacienteNome = body.pacienteNome || body.nome || searchParams.get('pacienteNome') || searchParams.get('nome');
    const dataHora = body.dataHora || searchParams.get('dataHora');
    const profissionalId = body.profissionalId || searchParams.get('profissionalId');
    const servicoId = body.servicoId || searchParams.get('servicoId');
    const tipoAtendimento = body.tipoAtendimento || searchParams.get('tipoAtendimento') || 'particular';
    const convenio = body.convenio || searchParams.get('convenio');
    const observacoes = body.observacoes || searchParams.get('observacoes');
    const categoria = body.categoria || searchParams.get('categoria') || 'consulta';
    const dataNascimento = body.dataNascimento || searchParams.get('dataNascimento');

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

    if (!pacienteTelefone || !dataHora || !tenantId || !profissionalId) {
      return NextResponse.json({
        error: 'Faltam parametros obrigatorios: pacienteTelefone, dataHora, tenantId, profissionalId',
        debug: { hasPhone: !!pacienteTelefone, hasDate: !!dataHora, hasTenant: !!tenantId, hasProf: !!profissionalId }
      }, { status: 400 });
    }

    let paciente = await prisma.paciente.findFirst({
      where: { telefone: pacienteTelefone, tenantId }
    });

    if (!paciente) {
      paciente = await prisma.paciente.create({
        // @ts-ignore
        data: { 
          nome: pacienteNome || 'Paciente WhatsApp', 
          telefone: pacienteTelefone, 
          tenantId,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined
        }
      });
    }

    const date = new Date(dataHora);
    const dayOfWeek = date.getDay();
    const reqHour = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');

    // 1. Validar Horário da Empresa
    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
    if (clinica) {
      if (reqHour < (clinica.openingTime || "08:00") || reqHour > (clinica.closingTime || "18:00")) {
        return NextResponse.json({ success: false, error: `Horário fora do funcionamento da clínica (${clinica.openingTime} - ${clinica.closingTime})` }, { status: 400 });
      }
    }

    // 2. Validar Escala do Profissional
    if (profissionalId) {
      const escala = await prisma.professionalSchedule.findFirst({
        where: { profissionalId, diaSemana: dayOfWeek, ativo: true }
      });
      if (!escala) {
        return NextResponse.json({ success: false, error: 'O profissional não atende neste dia da semana.' }, { status: 400 });
      }
      if (reqHour < escala.horaInicio || reqHour > escala.horaFim) {
        return NextResponse.json({ success: false, error: `Horário fora da escala do profissional (${escala.horaInicio} - ${escala.horaFim})` }, { status: 400 });
      }
    }

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

    // Anti-oscilação
    const duplicado = await prisma.agendamento.findUnique({
      where: { eventoId }
    });
    if (duplicado && duplicado.status !== 'cancelado') {
      return NextResponse.json({ success: true, agendamento: duplicado, message: 'Agendamento já existia' });
    }

    // VALIDAÇÃO DE CONFLITO EXPERT (V2.7)
    // Busca agendamentos do profissional no mesmo dia
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);

    const conflictingAppts = await prisma.agendamento.findMany({
      where: {
        tenantId,
        status: { in: ['confirmado', 'pendente'] },
        profissionalId: profissionalId || null,
        dataHora: { gte: startOfDay, lte: endOfDay }
      },
      include: { servico: true }
    });

    for (const a of conflictingAppts) {
      const aStart = new Date(a.dataHora).getTime();
      const aDur = a.durationMinutes || (a.servico?.duracaoMinutos ?? 30);
      const aBuf = a.servico?.bufferTimeMinutes ?? 0;
      const aEndWithBuffer = aStart + (aDur + aBuf) * 60000;

      const newStart = date.getTime();
      const newEnd = fimDataHora.getTime();

      // Se o novo início estiver dentro de um agendamento existente + buffer
      if (newStart >= aStart && newStart < aEndWithBuffer) {
        return NextResponse.json({ success: false, error: 'Horário bloqueado por agendamento ou intervalo (buffer)' }, { status: 409 });
      }

      // Se o novo agendamento trespassar o início de um existente
      if (newEnd > aStart && newStart < aStart) {
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
        // @ts-ignore
        categoria,
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
    } catch (e) { }

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
