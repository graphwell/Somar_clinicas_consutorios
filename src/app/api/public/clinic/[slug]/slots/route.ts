import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calcularSlotsDisponiveis, toMin } from '@/lib/slots-helper';

/**
 * GET /api/public/clinic/[slug]/slots
 * Query params: data (YYYY-MM-DD), servicoId, profissionalId (opcional, pode ser 'qualquer')
 * Retorna: { slots: string[], profissionalEscolhidoId: string | null }
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const { searchParams } = new URL(req.url);

  const dataParam = searchParams.get('data');
  const servicoId = searchParams.get('servicoId');
  const profissionalId = searchParams.get('profissionalId');

  if (!dataParam || !servicoId) {
    return NextResponse.json(
      { error: 'data e servicoId são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    // 1. Buscar clínica pelo slug
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: {
        tenantId: true,
        openingTime: true,
        closingTime: true,
      },
    });

    if (!clinica) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // 1b. Verificar dia bloqueado
    const dataInicio = new Date(`${dataParam}T00:00:00-03:00`);
    const dataFim = new Date(`${dataParam}T23:59:59-03:00`);
    const diaBloqueado = await prisma.diaBloqueado.findFirst({
      where: {
        tenantId: clinica.tenantId,
        ativo: true,
        data: { gte: dataInicio, lte: dataFim },
      },
    });
    if (diaBloqueado) {
      return NextResponse.json({ slots: [], bloqueado: true, mensagem: diaBloqueado.mensagem });
    }

    const clinicaStart = toMin(clinica.openingTime ?? '08:00');
    const clinicaEnd = toMin(clinica.closingTime ?? '18:00');

    // 2. Chamar o helper de cálculo
    const resultado = await calcularSlotsDisponiveis({
      tenantId: clinica.tenantId,
      dataParam,
      servicoId,
      profissionalId,
      clinicaStart,
      clinicaEnd,
    });

    return NextResponse.json(resultado);

  } catch (err: any) {
    if (err.message === 'SERVICO_NAO_ENCONTRADO') {
      return NextResponse.json({ error: 'serviço não encontrado' }, { status: 404 });
    }
    if (err.message === 'PROFISSIONAL_NAO_ATENDE_SERVICO') {
      return NextResponse.json({ error: 'profissional não atende este serviço' }, { status: 400 });
    }
    
    console.error('[public/slots]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

