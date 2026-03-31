import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    await getSessionInfo();

    const formData = await req.formData();
    const arquivo = formData.get('arquivo') as File | null;

    if (!arquivo) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (arquivo.size > maxBytes) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 10MB)' }, { status: 413 });
    }

    const bytes = await arquivo.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = arquivo.type || 'image/jpeg';

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    });

    const prompt = `Você é um assistente médico especializado em leitura de documentos clínicos.
Analise este documento e extraia as informações estruturadas.

Retorne APENAS um JSON válido no seguinte formato (sem texto extra):
{
  "tipo": "receita|laudo|exame|foto|outro",
  "data": "DD/MM/AAAA ou null",
  "profissional": "nome do médico/profissional ou null",
  "crm": "CRM ou null",
  "especialidade": "especialidade ou null",
  "medicamentos": [
    {
      "nome": "nome do medicamento",
      "dosagem": "dosagem",
      "posologia": "frequência de uso",
      "quantidade": "quantidade prescrita ou null"
    }
  ],
  "diagnostico": "diagnóstico ou achado principal ou null",
  "observacoes": "observações relevantes ou null",
  "resumo": "resumo em 1-2 frases do conteúdo do documento"
}

Se não conseguir identificar algum campo, use null.
Para tipos que não sejam receitas, mantenha medicamentos como array vazio [].`;

    let result;
    try {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
        { text: prompt },
      ]);
    } catch (geminiError: any) {
      // Fallback: retornar estrutura vazia com mensagem
      return NextResponse.json({
        tipo: 'outro',
        data: null,
        profissional: null,
        crm: null,
        especialidade: null,
        medicamentos: [],
        diagnostico: null,
        observacoes: null,
        resumo: 'Não foi possível processar o documento automaticamente.',
        erro: true,
      });
    }

    const text = result.response.text();

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        tipo: 'outro',
        data: null,
        profissional: null,
        crm: null,
        especialidade: null,
        medicamentos: [],
        diagnostico: null,
        observacoes: null,
        resumo: 'Não foi possível extrair informações estruturadas.',
        erro: true,
      });
    }

    const dados = JSON.parse(jsonMatch[0]);
    return NextResponse.json(dados);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
