import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await getSessionInfo()

    await prisma.notificacaoInterna.updateMany({
      where: { id: params.id, usuarioId: userId },
      data: { lida: true, lidaEm: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
