import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();
    const { message, history } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração de IA pendente (GEMINI_API_KEY).' }, { status: 500 });
    }

    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
    if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });

    const services = await prisma.servico.findMany({ where: { tenantId } });
    const servicesList = services.map(s => `- ${s.nome}: R$ ${s.preco.toFixed(2)}`).join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `Você é a Synka IA, a inteligência operacional da plataforma Synka para a clínica ${clinica.razaoSocial}.
Sua missão é ajudar o usuário administrador a gerenciar a clínica.
Contexto da Clínica:
- Nicho: ${clinica.nicho}
- Serviços:
${servicesList}

Diretrizes:
1. Seja profissional, concisa e direta.
2. Formate as respostas usando Markdown elegante.
3. Se o usuário perguntar sobre configurações, sugira ir para a página de Ajustes.
4. Você entende tudo sobre gestão de clínicas e agendamentos.
5. Responda sempre em Português Brasil.`;

    const chat = model.startChat({
      generationConfig: { maxOutputTokens: 500 },
      history: [
        { role: 'user', parts: [{ text: "Olá, quem é você?" }] },
        { role: 'model', parts: [{ text: `Olá! Sou a Synka IA, assistente da ${clinica.razaoSocial}. Em que posso ajudar na gestão da sua clínica hoje?` }] },
        ...(history || [])
      ]
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('[CHAT_IA_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao processar inteligência.' }, { status: 500 });
  }
}
