import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'
import { montarEEnviarResumo } from '@/lib/resumo-diario'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo()
    const config = await prisma.resumoConfig.findUnique({ where: { tenantId } })
    return NextResponse.json(config ?? {
      ativo: true,
      frequencia: 'diario',
      horaDiario: '07:00',
      diaSemana: 'segunda',
      horaSemanal: '07:00',
      recebeAdmin: true,
      recebeRecepcao: false,
      recebeProfissional: false,
      secaoAgenda: true,
      secaoOcupacao: true,
      secaoFinanceiro: true,
      secaoEstoque: true,
      secaoFilaEspera: true,
      secaoInsightsIA: true,
      estoqueMinimo: 3,
    })
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId } = await getSessionInfo()
    const body = await request.json()

    const config = await prisma.resumoConfig.upsert({
      where: { tenantId },
      update: body,
      create: { tenantId, ...body },
    })

    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getSessionInfo()
    const { action } = await request.json()

    if (action === 'testar') {
      await montarEEnviarResumo(tenantId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
