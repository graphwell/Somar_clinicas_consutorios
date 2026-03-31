import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function GET(req: Request) {
  try {
    await getSessionInfo();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ resultados: [] });
    }

    const prompt = `Você é um especialista em CID-10 (Classificação Internacional de Doenças, 10ª revisão).
Busque por CIDs relacionados ao termo: "${q}"

Retorne os 8 resultados mais relevantes no formato JSON:
{
  "resultados": [
    { "codigo": "X00.0", "descricao": "Descrição completa do CID" }
  ]
}

Inclua apenas CIDs reais e válidos. Responda SOMENTE com o JSON.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Resposta inválida');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ resultados: [] });

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
