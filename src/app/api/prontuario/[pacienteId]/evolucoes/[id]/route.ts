import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — evolução completa
export async function GET(_req: Request, { params }: { params: Promise<{ pacienteId: string; id: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId, id } = await params;

    const evolucao = await prisma.prontuarioRegistro.findFirst({
      where: { id, pacienteId, tenantId },
      include: {
        profissional: { select: { id: true, nome: true } },
        medidas: true,
        arquivos: true,
      },
    });

    if (!evolucao) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json(evolucao);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — editar evolução (apenas o autor)
export async function PUT(req: Request, { params }: { params: Promise<{ pacienteId: string; id: string }> }) {
  try {
    const { tenantId, profissionalId, role } = await getSessionInfo();
    const { pacienteId, id } = await params;
    const body = await req.json();

    const existing = await prisma.prontuarioRegistro.findFirst({
      where: { id, pacienteId, tenantId },
    });

    if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Profissional só edita suas próprias evoluções
    if (role === 'profissional' && existing.profissionalId !== profissionalId) {
      return NextResponse.json({ error: 'Sem permissão para editar esta evolução' }, { status: 403 });
    }

    const {
      queixaPrincipal, evolucao, historiaMolestia, historicoMedico,
      exameSolicitado, exameResultado, hipoteseDiagnostica, conduta,
      retornoEm, cidCodigo, cidDescricao,
      pressaoSistolica, pressaoDiastolica, temperatura, saturacao, glicemia,
      historicoAlimentar, restricoes, objetivoPaciente, planoAlimentar, recordatorio24h, metas,
    } = body;

    const updated = await prisma.prontuarioRegistro.update({
      where: { id },
      data: {
        queixaPrincipal, evolucao, historiaMolestia, historicoMedico,
        exameSolicitado, exameResultado, hipoteseDiagnostica, conduta,
        retornoEm: retornoEm ? new Date(retornoEm) : null,
        cidCodigo, cidDescricao,
        pressaoSistolica: pressaoSistolica != null ? parseInt(pressaoSistolica) : undefined,
        pressaoDiastolica: pressaoDiastolica != null ? parseInt(pressaoDiastolica) : undefined,
        temperatura: temperatura != null ? parseFloat(temperatura) : undefined,
        saturacao: saturacao != null ? parseInt(saturacao) : undefined,
        glicemia: glicemia != null ? parseInt(glicemia) : undefined,
        historicoAlimentar, restricoes, objetivoPaciente, planoAlimentar, recordatorio24h, metas,
      },
      include: { profissional: { select: { id: true, nome: true } }, medidas: true },
    });

    return NextResponse.json({ success: true, registro: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
