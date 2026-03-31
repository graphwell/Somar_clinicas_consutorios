import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

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

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Resposta inválida');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Formato inválido');

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
