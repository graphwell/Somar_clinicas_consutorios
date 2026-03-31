import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function POST(req: Request) {
  try {
    await getSessionInfo();

    const body = await req.json();
    const {
      tipo,
      queixaPrincipal,
      transcricao,
      historicoMedico,
      medicamentos,
      alergias,
      especialidade,
    } = body;

    const prompt = `Você é um médico experiente auxiliando na redação de prontuários eletrônicos.
Com base nas informações abaixo, gere um rascunho no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).

Tipo de prontuário: ${tipo || 'CLINICO'}
Especialidade: ${especialidade || 'Clínico Geral'}
Queixa principal: ${queixaPrincipal || 'Não informada'}
Transcrição da consulta: ${transcricao || 'Não disponível'}
Histórico médico: ${historicoMedico || 'Não informado'}
Medicamentos em uso: ${medicamentos || 'Nenhum'}
Alergias: ${alergias || 'Nenhuma conhecida'}

Responda SOMENTE com um JSON válido no seguinte formato:
{
  "soapSubjetivo": "Relato do paciente sobre sintomas e queixas (perspectiva subjetiva)",
  "soapObjetivo": "Dados objetivos: exame físico, sinais vitais, resultados de exames",
  "soapAvaliacao": "Hipótese diagnóstica ou diagnóstico e raciocínio clínico",
  "soapPlano": "Conduta terapêutica: medicamentos, exames solicitados, encaminhamentos, retorno",
  "cidsSugeridos": [
    { "codigo": "X00", "descricao": "Descrição do CID", "relevancia": 0.9 }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Resposta inválida da IA');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Formato de resposta inválido');

    const soap = JSON.parse(jsonMatch[0]);
    return NextResponse.json(soap);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
