import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    await getSessionInfo();

    const body = await req.json();
    const { tipo, especialidade, queixaPrincipal, historicoMedico } = body;

    const prompt = `Você é um médico especialista em ${especialidade || 'clínica geral'}.
Um paciente chegou com a queixa: "${queixaPrincipal || 'não informada'}".
Histórico médico relevante: ${historicoMedico || 'não disponível'}.
Tipo de prontuário: ${tipo || 'CLINICO'}.

Gere 5 perguntas de anamnese dinâmicas e clinicamente relevantes para aprofundar a avaliação.
As perguntas devem ser específicas para a queixa e especialidade.

Responda SOMENTE com um JSON válido:
{
  "perguntas": [
    { "id": 1, "pergunta": "...", "tipo": "texto" },
    { "id": 2, "pergunta": "...", "tipo": "escala_1_10" },
    { "id": 3, "pergunta": "...", "tipo": "sim_nao" },
    { "id": 4, "pergunta": "...", "tipo": "texto" },
    { "id": 5, "pergunta": "...", "tipo": "texto" }
  ]
}`;

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    const result = await model.generateContent([{ text: prompt }]);
    const textContent = result.response.text();

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Formato inválido retornado pela IA');

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
