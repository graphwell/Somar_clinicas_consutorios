import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    await getSessionInfo();

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'Arquivo de áudio não enviado' }, { status: 400 });
    }

    const audioBytes = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(audioBytes).toString('base64');
    const mimeType = (audioFile.type || 'audio/webm') as string;

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      {
        text: `Você é um assistente médico especializado em transcrição de prontuários eletrônicos.
Transcreva com precisão este áudio de consulta médica.
Preserve termos técnicos, medicamentos, dosagens e nomenclaturas clínicas.
Corrija apenas erros claros de pronúncia — mantenha o conteúdo fiel ao que foi dito.
Retorne apenas o texto transcrito, sem comentários adicionais.`,
      },
    ]);

    const transcricao = result.response.text();
    return NextResponse.json({ transcricao });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
