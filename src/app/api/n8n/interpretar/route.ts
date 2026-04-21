import { NextRequest } from 'next/server';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { mensagem?: string; contexto?: unknown; etapa?: string };
  try { body = await req.json(); } catch { return n8nError('JSON inválido', 'INVALID_BODY'); }

  const { mensagem, contexto, etapa } = body;
  if (!mensagem) return n8nError('mensagem obrigatória', 'MISSING_PARAM');

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `Analise a mensagem de WhatsApp e retorne JSON.
Mensagem: "${mensagem}"
Etapa atual: ${etapa ?? 'inicio'}
Contexto: ${JSON.stringify(contexto ?? {})}

Retorne APENAS JSON sem markdown:
{
  "intencao": "agendar|cancelar|remarcar|pix|confirmacao|saudacao|outro",
  "dados": {
    "servico": null,
    "data": null,
    "hora": null,
    "nome": null,
    "numero_opcao": null
  }
}

Regras:
- data deve ser YYYY-MM-DD se identificada
- hora deve ser HH:MM se identificada
- numero_opcao é o número digitado (1,2,3...) se o contexto espera uma escolha
- intencao "pix" se mensagem pede código pix`;

    const result = await model.generateContent(prompt);
    const texto = result.response.text().replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(texto);
      return n8nSuccess(parsed);
    } catch {
      return n8nSuccess({ intencao: 'outro', dados: {} });
    }
  } catch (err: any) {
    console.error('[interpretar]', err.message);
    // Fallback sem IA — interpretar por regex simples
    const msg = mensagem.toLowerCase().trim();
    const numOpcao = /^\d+$/.test(msg) ? parseInt(msg) : null;
    const intencao = /cancelar|cancela/.test(msg) ? 'cancelar'
      : /pix/.test(msg) ? 'pix'
      : /sim|confirmo/.test(msg) ? 'confirmacao'
      : /oi|olá|ola|bom dia|boa tarde|boa noite/.test(msg) ? 'saudacao'
      : 'outro';

    return n8nSuccess({ intencao, dados: { numero_opcao: numOpcao } });
  }
}
