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

  // Aceitar apenas mensagens recebidas
  if (body?.event_type !== 'message_received') {
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
  const instanceId: string = body?.instanceId ?? '';

  if (!telefone || !mensagem) {
    return Response.json({ ok: true });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[webhook/ultramsg] N8N_WEBHOOK_URL não configurada — mensagem ignorada');
    return Response.json({ ok: true });
  }

  // Repassar ao n8n de forma não-bloqueante
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telefone,
      mensagem,
      instanceId,
      timestamp: msgData?.time ?? Math.floor(Date.now() / 1000),
    }),
  }).catch(err => console.error('[webhook/ultramsg] Erro ao repassar ao n8n:', err));

  return Response.json({ ok: true });
}
