import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { createHash } from 'crypto';

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getSessionInfo();

    const { prontuarioId } = await req.json();

    if (!prontuarioId) {
      return NextResponse.json({ error: 'prontuarioId obrigatório' }, { status: 400 });
    }

    const prontuario = await prisma.prontuarioRegistro.findFirst({
      where: { id: prontuarioId, tenantId },
      include: { paciente: true, profissional: true },
    });

    if (!prontuario) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 });
    }

    if (prontuario.assinaturaHash) {
      return NextResponse.json({ error: 'Prontuário já assinado' }, { status: 409 });
    }

    // Build hash from immutable data
    const dadosParaHash = JSON.stringify({
      id: prontuario.id,
      pacienteId: prontuario.pacienteId,
      tenantId: prontuario.tenantId,
      tipo: prontuario.tipo,
      evolucao: prontuario.evolucao,
      soapSubjetivo: prontuario.soapSubjetivo,
      soapObjetivo: prontuario.soapObjetivo,
      soapAvaliacao: prontuario.soapAvaliacao,
      soapPlano: prontuario.soapPlano,
      cidCodigo: prontuario.cidCodigo,
      createdAt: prontuario.createdAt.toISOString(),
      assinadoEm: new Date().toISOString(),
    });

    const hash = createHash('sha256').update(dadosParaHash).digest('hex');

    const updated = await prisma.prontuarioRegistro.update({
      where: { id: prontuarioId },
      data: {
        assinadoPor: userId,
        assinadoEm: new Date(),
        assinaturaHash: hash,
      },
    });

    return NextResponse.json({
      success: true,
      assinaturaHash: hash,
      assinadoEm: updated.assinadoEm,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
