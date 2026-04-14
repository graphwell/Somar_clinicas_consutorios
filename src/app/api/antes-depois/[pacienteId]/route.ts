import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { pacienteId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo()

    const resultados = await prisma.resultadoAntesDepois.findMany({
      where: { tenantId, pacienteId: params.pacienteId },
      include: {
        profissional: { select: { nome: true } },
        consentimento: { select: { aceito: true, revogado: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(resultados)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
