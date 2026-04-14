import { NextResponse } from 'next/server'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await getSessionInfo()
    const { fotoAntesUrl, fotoDepoisUrl, procedimento } = await request.json()

    if (!fotoAntesUrl || !fotoDepoisUrl || !procedimento) {
      return NextResponse.json({ error: 'Campos obrigatorios ausentes' }, { status: 400 })
    }

    const prompt = `Voce e um sistema de analise de resultados esteticos. Analise as duas imagens fornecidas (ANTES e DEPOIS) do procedimento "${procedimento}" e gere um laudo tecnico descritivo.

O laudo deve:
1. Descrever objetivamente as mudancas visiveis
2. Mencionar aspectos especificos como textura, tom, volume, definicao ou outros relevantes para o procedimento
3. Ser profissional e tecnico mas acessivel
4. Ter entre 3 e 5 paragrafos
5. NAO fazer promessas medicas
6. NAO usar termos como "cura" ou "tratamento medico"
7. Usar linguagem estetica profissional

Formato:
ANALISE COMPARATIVA — ${procedimento.toUpperCase()}

[Laudo aqui]

Analise gerada por IA — validada pelo profissional responsavel.`

    function extrairBase64(dataUrl: string): { data: string; mimeType: string } {
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) return { mimeType: matches[1], data: matches[2] }
      return { mimeType: 'image/jpeg', data: dataUrl }
    }

    const imgAntes = extrairBase64(fotoAntesUrl)
    const imgDepois = extrairBase64(fotoDepoisUrl)

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash' })

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: imgAntes.mimeType as 'image/jpeg', data: imgAntes.data } },
      { inlineData: { mimeType: imgDepois.mimeType as 'image/jpeg', data: imgDepois.data } },
    ])

    const laudo = result.response.text()

    return NextResponse.json({ laudo })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
