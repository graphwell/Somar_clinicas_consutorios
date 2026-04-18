import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Geração de imagem migrada para client-side (canvas HTML5).
// Endpoint mantido para compatibilidade mas redirecionado para /salvar-imagem.
export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/antes-depois/salvar-imagem para salvar imagem gerada pelo cliente.' },
    { status: 410 }
  )
}
