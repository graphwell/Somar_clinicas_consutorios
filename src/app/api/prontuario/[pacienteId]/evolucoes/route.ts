import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — lista evoluções do paciente
export async function GET(req: Request, { params }: { params: Promise<{ pacienteId: string }> }) {
  try {
    const { tenantId, role, profissionalId } = await getSessionInfo();
    const { pacienteId } = await params;
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');

    const where: any = { pacienteId, tenantId };
    if (tipo) where.tipo = tipo;
    if (role === 'profissional' && profissionalId) where.profissionalId = profissionalId;

    const evolucoes = await prisma.prontuarioRegistro.findMany({
      where,
      include: {
        profissional: { select: { id: true, nome: true } },
        medidas: { orderBy: { createdAt: 'desc' }, take: 1 },
        arquivos: { select: { id: true, nome: true, tipo: true, url: true } },
        _count: { select: { arquivos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(evolucoes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — criar nova evolução
export async function POST(req: Request, { params }: { params: Promise<{ pacienteId: string }> }) {
  try {
    const { tenantId, userId, profissionalId } = await getSessionInfo();
    const { pacienteId } = await params;
    const body = await req.json();

    const {
      tipo = 'CLINICO', agendamentoId,
      queixaPrincipal, evolucao,
      historiaMolestia, historicoMedico,
      exameSolicitado, exameResultado,
      hipoteseDiagnostica, conduta,
      retornoEm, cidCodigo, cidDescricao,
      pressaoSistolica, pressaoDiastolica,
      temperatura, saturacao, glicemia,
      historicoAlimentar, restricoes, objetivoPaciente,
      planoAlimentar, recordatorio24h, metas,
      medidas,
    } = body;

    const registro = await prisma.prontuarioRegistro.create({
      data: {
        tenantId, pacienteId,
        profissionalId: profissionalId || null,
        tipo, agendamentoId: agendamentoId || null,
        queixaPrincipal, evolucao,
        historiaMolestia, historicoMedico,
        exameSolicitado, exameResultado,
        hipoteseDiagnostica, conduta,
        retornoEm: retornoEm ? new Date(retornoEm) : null,
        cidCodigo, cidDescricao,
        pressaoSistolica: pressaoSistolica ? parseInt(pressaoSistolica) : null,
        pressaoDiastolica: pressaoDiastolica ? parseInt(pressaoDiastolica) : null,
        temperatura: temperatura ? parseFloat(temperatura) : null,
        saturacao: saturacao ? parseInt(saturacao) : null,
        glicemia: glicemia ? parseInt(glicemia) : null,
        historicoAlimentar, restricoes, objetivoPaciente,
        planoAlimentar, recordatorio24h, metas,
        medidas: medidas?.peso ? {
          create: {
            peso: medidas.peso ? parseFloat(medidas.peso) : null,
            altura: medidas.altura ? parseFloat(medidas.altura) : null,
            imc: medidas.peso && medidas.altura
              ? parseFloat((parseFloat(medidas.peso) / (parseFloat(medidas.altura) ** 2)).toFixed(1))
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
        profissional: { select: { id: true, nome: true } },
        medidas: true,
      },
    });

    return NextResponse.json({ success: true, registro });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
