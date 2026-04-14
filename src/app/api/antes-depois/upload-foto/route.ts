import { NextResponse } from 'next/server'
import { getSessionInfo } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await getSessionInfo()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const tipo = formData.get('tipo') as string

    if (!file || !['antes', 'depois'].includes(tipo)) {
      return NextResponse.json({ error: 'Arquivo e tipo obrigatorios' }, { status: 400 })
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json({ error: 'Use JPG, PNG ou WEBP' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maximo 10MB por foto' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(new Uint8Array(bytes)).toString('base64')
    const url = `data:${file.type};base64,${base64}`

    return NextResponse.json({ url, tipo })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
