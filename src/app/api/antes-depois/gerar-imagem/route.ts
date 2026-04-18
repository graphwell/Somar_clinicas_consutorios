import { NextResponse } from 'next/server'
import { createCanvas, loadImage } from 'canvas'
import prisma from '@/lib/prisma'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getSessionInfo()
    const { resultadoId } = await request.json()

    const resultado = await prisma.resultadoAntesDepois.findUnique({
      where: { id: resultadoId, tenantId },
      include: {
        clinica: { select: { nome: true, logoUrl: true, configBranding: true } },
        profissional: { select: { nome: true } },
      },
    })

    if (!resultado) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const branding = resultado.clinica.configBranding as any
    const cor = branding?.primaryColor ?? '#40916C'
    const W = 1080
    const H = 1080
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    // Fundo
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    // Header (160px)
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, W, 160)
    ctx.fillStyle = cor
    ctx.fillRect(0, 0, W, 4)

    // Logo da clínica
    const logoUrl = resultado.clinica.logoUrl ?? branding?.logoUrl
    if (logoUrl) {
      try {
        const logo = await loadImage(logoUrl)
        const logoH = 70
        const logoW = (logo.width / logo.height) * logoH
        ctx.drawImage(logo, 40, 45, logoW, logoH)
      } catch {}
    }

    // Nome e subtítulo
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText(resultado.clinica.nome, 140, 85)
    ctx.fillStyle = cor
    ctx.font = '18px sans-serif'
    ctx.fillText('Resultado verificado', 140, 115)

    // Fotos (760px de altura)
    const fotoY = 160
    const fotoH = 760
    const fotoW = W / 2

    try {
      const imgAntes = await loadImage(resultado.fotoAntesUrl)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, fotoY, fotoW, fotoH)
      ctx.clip()
      ctx.drawImage(imgAntes, 0, fotoY, fotoW, fotoH)
      ctx.restore()
    } catch {}

    try {
      const imgDepois = await loadImage(resultado.fotoDepoisUrl)
      ctx.save()
      ctx.beginPath()
      ctx.rect(fotoW, fotoY, fotoW, fotoH)
      ctx.clip()
      ctx.drawImage(imgDepois, fotoW, fotoY, fotoW, fotoH)
      ctx.restore()
    } catch {}

    // Divisor central
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(W / 2 - 2, fotoY, 4, fotoH)

    // Círculo central com seta
    ctx.beginPath()
    ctx.arc(W / 2, fotoY + fotoH / 2, 30, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.fillStyle = '#1B2B3A'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('↔', W / 2, fotoY + fotoH / 2 + 8)
    ctx.textAlign = 'left'

    // Labels ANTES/DEPOIS
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(20, fotoY + 20, 90, 32)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('ANTES', 30, fotoY + 41)

    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(W - 110, fotoY + 20, 90, 32)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText('DEPOIS', W - 100, fotoY + 41)

    // Footer (160px)
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 920, W, 160)
    ctx.fillStyle = cor
    ctx.fillRect(0, 920, W, 3)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(resultado.procedimento, W / 2, 960)

    ctx.fillStyle = '#8A9BB0'
    ctx.font = '18px sans-serif'
    ctx.fillText(
      `${resultado.periodoTratamento} · ${resultado.profissional.nome}`,
      W / 2, 990
    )

    ctx.fillStyle = '#4A6480'
    ctx.font = '14px sans-serif'
    ctx.fillText('Imagem publicada com autorização do cliente', W / 2, 1020)

    ctx.fillStyle = cor
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('synka.somar.ia.br', W / 2, 1055)
    ctx.textAlign = 'left'

    // Gerar base64 PNG
    const base64 = canvas.toDataURL('image/png')
    const expirarEm = new Date(Date.now() + 48 * 3600 * 1000)

    await prisma.resultadoAntesDepois.update({
      where: { id: resultadoId },
      data: {
        imagemPngUrl: base64,
        imagemGeradaEm: new Date(),
        imagemExpirarEm: expirarEm,
      },
    })

    return NextResponse.json({ ok: true, url: base64 })
  } catch (error: any) {
    console.error('[gerar-imagem]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
