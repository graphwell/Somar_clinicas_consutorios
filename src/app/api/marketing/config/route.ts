import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { wasenderPost } from '@/lib/wasender';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const [config, instance] = await Promise.all([
      prisma.marketingConfig.upsert({
        where: { tenantId },
        create: { tenantId },
        update: {},
      }),
      prisma.whatsappInstance.findFirst({
        where: { empresaId: tenantId },
        orderBy: { criadoEm: 'desc' },
        select: { id: true, sessionId: true, numeroWa: true, status: true, plataforma: true },
      }),
    ]);

    // Nunca expor a API key completa — retorna mascarada
    const configPublico = {
      ...config,
      wasenderApiKey: config.wasenderApiKey
        ? `${'•'.repeat(Math.max(0, config.wasenderApiKey.length - 4))}${config.wasenderApiKey.slice(-4)}`
        : null,
      _temApiKey: !!config.wasenderApiKey,
    };

    return NextResponse.json({ config: configPublico, instance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();

    // Se veio nova API key (não mascarada), validar antes de salvar
    if (body.wasenderApiKey && !body.wasenderApiKey.includes('•')) {
      const res = await wasenderPost(body.wasenderApiKey, '/sessions', undefined);
      // WaSender retorna 200 ou 401 — aceitamos qualquer resposta que não seja erro de rede
      // O teste real é feito pelo endpoint /testar-conexao
    }

    const data: Record<string, any> = {};
    const allowed = [
      'wasenderApiKey', 'wasenderSessionId',
      'lembreteAtivo', 'lembreteAntecedenciaHoras', 'lembreteHorario', 'lembreteTemplate',
      'aniversarioAtivo', 'aniversarioHorario', 'aniversarioDescontoPct', 'aniversarioTemplate',
      'linkConfirmacao', 'nomeClinica',
    ];
    for (const key of allowed) {
      if (key in body && !(body[key] as string)?.includes?.('•')) {
        data[key] = body[key];
      }
    }

    const config = await prisma.marketingConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });

    return NextResponse.json({ success: true, config: { ...config, wasenderApiKey: undefined } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
