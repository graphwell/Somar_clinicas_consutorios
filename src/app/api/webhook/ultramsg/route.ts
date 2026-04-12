import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook/ultramsg
 * Recebe eventos do UltraMsg e repassa ao n8n via N8N_WEBHOOK_URL.
 * Rota pública — sem auth (UltraMsg não envia API Key).
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: true }); // retornar 200 sempre para não retentar
  }

  // Validação básica de estrutura — UltraMsg sempre envia event_type e instanceId
  if (!body?.event_type || !body?.instanceId) {
    return Response.json({ ok: true });
  }

  // Verificar se instanceId é reconhecido (central ou instância de cliente)
  const instanceId: string = body.instanceId ?? '';
  const instanceCentral = process.env.ULTRAMSG_INSTANCE_ID;
  if (instanceCentral && instanceId !== instanceCentral) {
    const instanciaConhecida = await prisma.whatsappInstance.findFirst({
      where: {
        OR: [
          { sessionId: instanceId },
          { sessionId: `instance${instanceId}` },
        ],
      },
      select: { id: true },
    }).catch(() => null);

    if (!instanciaConhecida) {
      console.warn('[webhook/ultramsg] instanceId desconhecido rejeitado:', instanceId);
      return Response.json({ ok: true }); // 200 silencioso — não revelar rejeição
    }
  }

  // Aceitar apenas mensagens recebidas
  if (body.event_type !== 'message_received') {
    return Response.json({ ok: true });
  }

  const msgData = body.data;

  // Ignorar mensagens de grupos
  if (typeof msgData?.from === 'string' && msgData.from.includes('@g.us')) {
    return Response.json({ ok: true });
  }

  // Ignorar mensagens próprias (eco)
  if (msgData?.fromMe === true || msgData?.from === msgData?.to) {
    return Response.json({ ok: true });
  }

  const from: string = msgData?.from ?? '';
  // Extrair número limpo: "5585999990000@c.us" → "5585999990000"
  const telefone = from.replace(/@c\.us$/, '').replace(/\D/g, '');
  const mensagem: string = msgData?.body ?? '';

  if (!telefone || !mensagem) {
    return Response.json({ ok: true });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[webhook/ultramsg] N8N_WEBHOOK_URL não configurada — mensagem ignorada');
    return Response.json({ ok: true });
  }

  // Buscar a qual clínica esta instância pertence
  let tenantId = 'demo-synka-master';
  try {
    // Ultramsg manda o nome da instancia via body.instanceId (ex: "instance168762" ou só "168762")
    const waInstance = await prisma.whatsappInstance.findFirst({
      where: {
        OR: [
          { sessionId: instanceId },
          { sessionId: `instance${instanceId}` }
        ]
      },
      select: { empresaId: true }
    });
    if (waInstance?.empresaId) tenantId = waInstance.empresaId;
  } catch (err) {
    console.error('[webhook/ultramsg] Erro ao buscar instância:', err);
  }

  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone,
        sender_number: telefone,
        from: telefone,
        sessionId: telefone,
        mensagem,
        message: mensagem,
        text: mensagem,
        instanceId,
        tenantId,
        timestamp: msgData?.time ?? Math.floor(Date.now() / 1000),
        messageId: msgData?.id,
      }),
    });
    console.log(`[webhook/ultramsg] n8n status: ${n8nRes.status}`);
  } catch (err) {
    console.error('[webhook/ultramsg] Erro ao repassar ao n8n:', err);
  }

  return Response.json({ ok: true });
}
