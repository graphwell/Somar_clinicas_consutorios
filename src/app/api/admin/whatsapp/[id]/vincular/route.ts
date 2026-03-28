import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSynkaAdmin, wasenderPost, INSTANCE_SELECT } from '@/lib/wasender';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireSynkaAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Acesso restrito: apenas synka_admin' }, { status: 403 });

  const { empresaId } = await request.json();
  if (!empresaId) return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });

  const instancia = await prisma.whatsappInstance.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, sessionId: true, bearerToken: true },
  });

  if (!instancia) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
  if (instancia.status !== 'LIVRE') {
    return NextResponse.json({ error: 'Instância não está LIVRE' }, { status: 409 });
  }

  const empresa = await prisma.clinica.findUnique({ where: { tenantId: empresaId } });
  if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  // Configurar webhook no WasenderAPI apontando para o N8N do Synka
  const webhookUrl = `${process.env.WASENDER_N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL + '/webhook/whatsapp-agent-dynamic'}`;
  await wasenderPost(instancia.bearerToken, `/session/${instancia.sessionId}/webhook`, {
    url: webhookUrl,
    events: ['message', 'connection', 'qrcode'],
  });

  const atualizado = await prisma.whatsappInstance.update({
    where: { id: params.id },
    data: {
      empresaId,
      status: 'EM_USO',
      webhookUrl,
      conectadoEm: new Date(),
    },
    select: INSTANCE_SELECT,
  });

  return NextResponse.json({ success: true, instancia: atualizado });
}
