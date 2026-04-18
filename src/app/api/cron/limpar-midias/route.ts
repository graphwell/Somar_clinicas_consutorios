import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agora = new Date()

  const expirados = await prisma.resultadoAntesDepois.findMany({
    where: {
      OR: [
        { imagemExpirarEm: { lte: agora }, imagemPngUrl: { not: null } },
        { videoExpirarEm: { lte: agora }, videoMp4Url: { not: null } },
      ],
    },
    select: { id: true },
  })

  if (expirados.length === 0) {
    return NextResponse.json({ ok: true, deletados: 0 })
  }

  await prisma.resultadoAntesDepois.updateMany({
    where: { id: { in: expirados.map(e => e.id) } },
    data: {
      imagemPngUrl: null,
      imagemGeradaEm: null,
      imagemExpirarEm: null,
      videoMp4Url: null,
      videoGeradoEm: null,
      videoExpirarEm: null,
    },
  })

  return NextResponse.json({ ok: true, deletados: expirados.length })
}
