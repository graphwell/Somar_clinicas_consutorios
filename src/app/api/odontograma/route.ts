import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

// GET — busca odontograma de um paciente (prontuário mais recente ou por prontuarioId)
export async function GET(request: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const prontuarioId = searchParams.get('prontuarioId');

    if (!pacienteId && !prontuarioId) {
      return NextResponse.json({ error: 'pacienteId ou prontuarioId obrigatório' }, { status: 400 });
    }

    let dentes;
    if (prontuarioId) {
      dentes = await prisma.odontogramaItem.findMany({
        where: { prontuarioId, tenantId },
        orderBy: { numeroDente: 'asc' },
      });
    } else {
      // Busca o prontuário odontológico mais recente do paciente
      const prontuario = await prisma.prontuarioRegistro.findFirst({
        where: { tenantId, pacienteId: pacienteId!, tipo: 'ODONTOLOGICO' },
        orderBy: { createdAt: 'desc' },
      });
      dentes = prontuario ? await prisma.odontogramaItem.findMany({
        where: { prontuarioId: prontuario.id, tenantId },
        orderBy: { numeroDente: 'asc' },
      }) : [];
    }

    return NextResponse.json(dentes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — cria ou atualiza dente no odontograma
export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionInfo();
    const body = await request.json();
    const { prontuarioId, pacienteId, numeroDente, status, facesAfetadas, observacao } = body;

    if (!prontuarioId || !numeroDente || !status) {
      return NextResponse.json({ error: 'prontuarioId, numeroDente e status são obrigatórios' }, { status: 400 });
    }

    // Busca estado anterior para histórico
    const anterior = await prisma.odontogramaItem.findUnique({
      where: { prontuarioId_numeroDente: { prontuarioId, numeroDente } },
    });

    const dente = await prisma.odontogramaItem.upsert({
      where: { prontuarioId_numeroDente: { prontuarioId, numeroDente } },
      update: { status, facesAfetadas: facesAfetadas || [], observacao: observacao || null, atualizadoPor: userId },
      create: {
        prontuarioId,
        pacienteId,
        tenantId,
        numeroDente,
        status,
        facesAfetadas: facesAfetadas || [],
        observacao: observacao || null,
        atualizadoPor: userId,
      },
    });

    // Registra histórico
    await prisma.odontogramaHistorico.create({
      data: {
        numeroDente,
        statusAnterior: anterior?.status || null,
        statusNovo: status,
        observacao: observacao || null,
        alteradoPor: userId,
        tenantId,
        pacienteId,
      },
    });

    return NextResponse.json({ success: true, dente });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
