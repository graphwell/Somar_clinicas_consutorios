import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

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

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 800,
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
