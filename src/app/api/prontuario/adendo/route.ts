import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

/**
 * POST /api/prontuario/adendo
 * Cria um adendo vinculado a um prontuário já assinado.
 * O prontuário original permanece imutável.
 */
export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getSessionInfo();

    const { prontuarioId, texto } = await req.json();

    if (!prontuarioId || !texto?.trim()) {
      return NextResponse.json(
        { error: 'prontuarioId e texto são obrigatórios' },
        { status: 400 },
      );
    }

    // Verificar que o prontuário pertence ao tenant e está assinado
    const original = await prisma.prontuarioRegistro.findFirst({
      where: { id: prontuarioId, tenantId },
      select: { id: true, pacienteId: true, tipo: true, assinaturaHash: true, profissionalId: true },
    });

    if (!original) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 });
    }

    if (!original.assinaturaHash) {
      return NextResponse.json(
        { error: 'O prontuário precisa estar assinado para receber adendos' },
        { status: 400 },
      );
    }

    // Criar adendo como novo registro vinculado
    const adendo = await prisma.prontuarioRegistro.create({
      data: {
        pacienteId: original.pacienteId,
        tenantId,
        profissionalId: original.profissionalId,
        tipo: 'ADENDO',
        queixaPrincipal: `Adendo ao prontuário ${prontuarioId}`,
        evolucao: texto.trim(),
        iaRevisado: false,
        // Assinar automaticamente o adendo
        assinadoPor: userId,
        assinadoEm: new Date(),
        assinaturaHash: `adendo-${prontuarioId}-${Date.now()}`,
      },
    });

    return NextResponse.json({ success: true, adendoId: adendo.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
