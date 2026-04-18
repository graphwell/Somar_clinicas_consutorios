import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getSessionInfo()
    const { resultadoId, imagemPngUrl } = await request.json()

    if (!resultadoId || !imagemPngUrl) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const expirarEm = new Date(Date.now() + 48 * 3600 * 1000)

    await prisma.resultadoAntesDepois.update({
      where: { id: resultadoId, tenantId },
      data: {
        imagemPngUrl,
        imagemGeradaEm: new Date(),
        imagemExpirarEm: expirarEm,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[salvar-imagem]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
