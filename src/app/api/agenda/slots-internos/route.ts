import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { calcularSlotsDisponiveis, toMin } from '@/lib/slots-helper';
import { verificarBlacklist } from '@/lib/blacklist';

/**
 * GET /api/agenda/slots-internos
 * Query params: data (YYYY-MM-DD), servicoId, profissionalId (opcional, default: todos)
 * JWT authentication required.
 */
export async function GET(req: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dataParam      = searchParams.get('data');
    const servicoId      = searchParams.get('servicoId');
    const profissionalId = searchParams.get('profissionalId');
    const pacienteId     = searchParams.get('pacienteId');

    if (!dataParam || !servicoId) {
      return NextResponse.json(
        { error: 'data e servicoId são obrigatórios' },
        { status: 400 }
      );
    }

    // Guards de paciente (blacklist + inadimplência) — opcionais quando pacienteId presente
    if (pacienteId) {
      const { bloqueado, liberadoEm } = await verificarBlacklist(pacienteId, prisma);
      if (bloqueado) {
        return NextResponse.json(
          { error: 'PACIENTE_BLOQUEADO', liberadoEm: liberadoEm?.toISOString() ?? null },
          { status: 403 }
        );
      }

      const assinaturaInadimplente = await prisma.assinaturaCliente.findFirst({
        where: { pacienteId, status: 'inadimplente' },
        select: { planoId: true },
      });
      if (assinaturaInadimplente) {
        return NextResponse.json(
          { error: 'ASSINANTE_INADIMPLENTE', planoId: assinaturaInadimplente.planoId },
          { status: 403 }
        );
      }
    }

    // Buscar clínica para horários de operação
    const clinica = await prisma.clinica.findFirst({
      where: { tenantId },
      select: {
        openingTime: true,
        closingTime: true,
      },
    });

    if (!clinica) {
      return NextResponse.json({ error: 'clinica not_found' }, { status: 404 });
    }

    const clinicaStart = toMin(clinica.openingTime ?? '08:00');
    const clinicaEnd = toMin(clinica.closingTime ?? '18:00');

    // Chamar o helper
    const resultado = await calcularSlotsDisponiveis({
      tenantId,
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
    
    console.error('[agenda/slots-internos]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
