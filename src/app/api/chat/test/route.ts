import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Rota pública de diagnóstico — remover após confirmar funcionamento
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    return NextResponse.json({ ok: false, erro: 'GEMINI_API_KEY não encontrada nas variáveis de ambiente' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const m = genAI.getGenerativeModel({ model });
    const result = await m.generateContent('Responda apenas: ok');
    const text = result.response.text();
    return NextResponse.json({ ok: true, model, resposta: text, keyPrefixo: apiKey.slice(0, 8) + '...' });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      model,
      keyPrefixo: apiKey.slice(0, 8) + '...',
      erro: error?.message,
    });
  }
}
