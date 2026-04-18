import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId, tenantId } = await getSessionInfo()

    const notificacoes = await prisma.notificacaoInterna.findMany({
      where: { usuarioId: userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const naoLidas = notificacoes.filter((n) => !n.lida).length

    return NextResponse.json({ notificacoes, naoLidas })
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
