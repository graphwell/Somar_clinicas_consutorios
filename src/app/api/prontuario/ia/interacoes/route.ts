import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    await getSessionInfo();

    const body = await req.json();
    const { medicamentosAtuais, novoMedicamento, alergias } = body;

    if (!novoMedicamento) {
      return NextResponse.json({ interacoes: [], alertas: [] });
    }

    const prompt = `Você é um farmacologista clínico especializado em interações medicamentosas.

Medicamentos em uso pelo paciente: ${medicamentosAtuais || 'Nenhum'}
Novo medicamento a prescrever: ${novoMedicamento}
Alergias conhecidas: ${alergias || 'Nenhuma'}

Analise possíveis interações medicamentosas e riscos.

Responda SOMENTE com JSON válido:
{
  "interacoes": [
    {
      "medicamento1": "...",
      "medicamento2": "...",
      "gravidade": "LEVE|MODERADA|GRAVE|CONTRAINDICADO",
      "descricao": "Descrição da interação",
      "recomendacao": "O que fazer"
    }
  ],
  "alertas": [
    {
      "tipo": "ALERGIA|CONTRAINDICACAO|PRECAUCAO",
      "mensagem": "..."
    }
  ],
  "seguro": true
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
