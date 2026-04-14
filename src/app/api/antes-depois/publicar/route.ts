import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

function nanoid(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getSessionInfo()
    const body = await request.json()

    const slug = nanoid(8)

    const resultado = await prisma.resultadoAntesDepois.create({
      data: {
        tenantId,
        pacienteId: body.pacienteId,
        profissionalId: body.profissionalId,
        consentimentoId: body.consentimentoId,
        fotoAntesUrl: body.fotoAntesUrl,
        fotoDepoisUrl: body.fotoDepoisUrl,
        procedimento: body.procedimento,
        periodoTratamento: body.periodoTratamento,
        dataAntes: new Date(body.dataAntes),
        laudoIA: body.laudoIA,
        laudoEditado: body.laudoEditado ?? null,
        laudoValidado: true,
        laudoValidadoEm: new Date(),
        assinaturaProfissional: body.assinaturaProfissional ?? null,
        assinadoEm: new Date(),
        slugPublico: slug,
        publicado: true,
        publicadoEm: new Date(),
        expirarEm: null,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://synka.somar.ia.br'

    return NextResponse.json({
      id: resultado.id,
      slug,
      urlPublica: `${baseUrl}/r/${slug}`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
