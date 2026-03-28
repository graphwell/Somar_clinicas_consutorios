import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET — contexto completo do paciente para abertura do prontuário
export async function GET(_req: Request, { params }: { params: Promise<{ pacienteId: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = await params;

    const [paciente, alergias, medicamentos, ultimaEvolucao] = await Promise.all([
      prisma.paciente.findFirst({
        where: { id: pacienteId, tenantId },
        select: { id: true, nome: true, telefone: true, dataNascimento: true, cpf: true, convenio: true },
      }),
      prisma.pacienteAlergia.findMany({
        where: { pacienteId, tenantId },
        orderBy: { gravidade: 'desc' },
      }),
      prisma.pacienteMedicamento.findMany({
        where: { pacienteId, tenantId, ativo: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prontuarioRegistro.findFirst({
        where: { pacienteId, tenantId },
        orderBy: { createdAt: 'desc' },
        include: { profissional: { select: { nome: true } } },
      }),
    ]);

    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });

    return NextResponse.json({ paciente, alergias, medicamentos, ultimaEvolucao });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
