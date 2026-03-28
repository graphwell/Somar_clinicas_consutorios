import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { tenantId, profissionalId, role } = await getSessionInfo();
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    if (!pacienteId) {
      return NextResponse.json({ error: 'pacienteId obrigatório' }, { status: 400 });
    }

    const where: any = { tenantId, pacienteId };
    // Profissional vê apenas seus próprios prontuários
    if (role === 'profissional' && profissionalId) {
      where.profissionalId = profissionalId;
    }

    const prontuarios = await prisma.prontuarioRegistro.findMany({
      where,
      include: {
        profissional: { select: { id: true, nome: true } },
        medidas: { orderBy: { createdAt: 'desc' } },
        odontograma: { orderBy: { numeroDente: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(prontuarios);
  } catch (error: any) {
    console.error('[PRONTUARIO_GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, userId, profissionalId } = await getSessionInfo();
    const body = await request.json();
    const {
      pacienteId, tipo, agendamentoId,
      // Clínico
      queixaPrincipal, historiaMolestia, historicoMedico, medicamentosUso,
      alergias, exameSolicitado, exameResultado, hipoteseDiagnostica, conduta,
      // Nutricional
      historicoAlimentar, restricoes, objetivoPaciente, planoAlimentar,
      recordatorio24h, metas,
      // Medidas corporais (nutricional)
      medidas,
    } = body;

    if (!pacienteId || !tipo) {
      return NextResponse.json({ error: 'pacienteId e tipo são obrigatórios' }, { status: 400 });
    }

    const registro = await prisma.prontuarioRegistro.create({
      data: {
        tenantId,
        pacienteId,
        profissionalId: profissionalId || null,
        tipo,
        agendamentoId: agendamentoId || null,
        queixaPrincipal, historiaMolestia, historicoMedico, medicamentosUso,
        alergias, exameSolicitado, exameResultado, hipoteseDiagnostica, conduta,
        historicoAlimentar, restricoes, objetivoPaciente, planoAlimentar,
        recordatorio24h, metas,
        medidas: medidas ? {
          create: {
            peso: medidas.peso ? parseFloat(medidas.peso) : null,
            altura: medidas.altura ? parseFloat(medidas.altura) : null,
            imc: medidas.peso && medidas.altura
              ? parseFloat((medidas.peso / (medidas.altura * medidas.altura)).toFixed(1))
              : null,
            percGordura: medidas.percGordura ? parseFloat(medidas.percGordura) : null,
            circAbdominal: medidas.circAbdominal ? parseFloat(medidas.circAbdominal) : null,
            circQuadril: medidas.circQuadril ? parseFloat(medidas.circQuadril) : null,
            circBraco: medidas.circBraco ? parseFloat(medidas.circBraco) : null,
            circCoxa: medidas.circCoxa ? parseFloat(medidas.circCoxa) : null,
          }
        } : undefined,
      },
      include: {
        medidas: true,
        profissional: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json({ success: true, registro });
  } catch (error: any) {
    console.error('[PRONTUARIO_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
