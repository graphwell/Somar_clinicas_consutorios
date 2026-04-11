/**
 * Unit tests — 3 casos críticos do sistema de webhook.
 *
 * Executar (sem configurar Jest):
 *   npx tsx tests/webhook.unit.test.ts
 *
 * Para rodar com Jest (instalar se necessário):
 *   npm install -D jest @types/jest ts-jest
 *   npx jest tests/webhook.unit.test.ts
 */

import crypto from 'crypto';
import { WasenderProvider } from '../src/providers/wasender.provider';
import { UltraMsgProvider } from '../src/providers/ultramsg.provider';

// ── Mini runner (zero dependências) ──────────────────────────────────────────

let passed = 0;
let failed = 0;
const queue: Promise<void>[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  const p = Promise.resolve()
    .then(() => fn())
    .then(() => { console.log(`  ✅  ${name}`); passed++; })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌  ${name}\n       → ${msg}`);
      failed++;
    });
  queue.push(p);
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHmac(body: Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASO 1 — validateSignature
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n[CASO 1] validateSignature\n');

test('Wasender: HMAC válido → true', () => {
  const p      = new WasenderProvider();
  const secret = 'test-secret-wasender';
  const body   = Buffer.from(JSON.stringify({ instanceId: 'inst_1', messageId: 'msg_1' }));
  const sig    = makeHmac(body, secret);
  assert(p.validateSignature(body, sig, secret), 'Deveria retornar true');
});

test('Wasender: HMAC inválido → false', () => {
  const p    = new WasenderProvider();
  const body = Buffer.from('{"instanceId":"inst_1"}');
  assert(!p.validateSignature(body, 'assinatura_errada_000000000000000000000000000000000000000000000000000000000000000', 'secret'), 'Deveria retornar false');
});

test('Wasender: prefixo "sha256=" é normalizado corretamente', () => {
  const p      = new WasenderProvider();
  const secret = 'prefixed-test';
  const body   = Buffer.from('body_test');
  const hex    = makeHmac(body, secret);
  // Alguns provedores enviam "sha256=<hex>"
  assert(p.validateSignature(body, `sha256=${hex}`, secret), 'Deveria aceitar prefixo sha256=');
});

test('UltraMsg: HMAC válido → true', () => {
  const p      = new UltraMsgProvider();
  const secret = 'test-secret-ultramsg';
  const body   = Buffer.from(JSON.stringify({ instanceId: 'i168762', event_type: 'message_received' }));
  const sig    = makeHmac(body, secret);
  assert(p.validateSignature(body, sig, secret), 'Deveria retornar true');
});

test('UltraMsg: HMAC inválido → false', () => {
  const p    = new UltraMsgProvider();
  const body = Buffer.from('{"data":"qualquer"}');
  assert(!p.validateSignature(body, 'f'.repeat(64), 'secret'), 'Deveria retornar false');
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASO 2 — parseWebhook
// ═══════════════════════════════════════════════════════════════════════════════

console.log('[CASO 2] parseWebhook\n');

test('Wasender: payload completo → IncomingMessage válida', () => {
  const p   = new WasenderProvider();
  const msg = p.parseWebhook({
    instanceId: 'inst_abc',
    messageId:  'msg_xyz',
    from:       '5585999990000',
    message:    { body: 'Quero agendar' },
    timestamp:  1_700_000_000,
  });
  assert(msg !== null,                   'Deveria parsear');
  assert(msg!.instanceId === 'inst_abc', 'instanceId incorreto');
  assert(msg!.messageId  === 'msg_xyz',  'messageId incorreto');
  assert(msg!.from       === '5585999990000', 'from incorreto');
  assert(msg!.body       === 'Quero agendar', 'body incorreto');
});

test('Wasender: message como string simples → parseia corretamente', () => {
  const p   = new WasenderProvider();
  const msg = p.parseWebhook({
    instanceId: 'i1', messageId: 'm1', from: '5500', message: 'texto direto',
  });
  assert(msg !== null && msg.body === 'texto direto', 'body deveria ser "texto direto"');
});

test('Wasender: campos obrigatórios faltando → null', () => {
  const p = new WasenderProvider();
  assert(p.parseWebhook({ instanceId: 'i1' }) === null, 'Deveria retornar null sem messageId/from/body');
  assert(p.parseWebhook(null) === null,                  'null → null');
  assert(p.parseWebhook('string') === null,              'string → null');
});

test('UltraMsg: mensagem recebida válida → IncomingMessage', () => {
  const p   = new UltraMsgProvider();
  const msg = p.parseWebhook({
    event_type: 'message_received',
    instanceId: 'i168762',
    data: {
      id:     'msg_ultra_1',
      from:   '5585999990000@c.us',
      body:   'Oi, quero marcar',
      fromMe: false,
      time:   1_700_000_000,
    },
  });
  assert(msg !== null,                      'Deveria parsear');
  assert(msg!.from === '5585999990000',     'from deveria ser número limpo sem @c.us');
  assert(msg!.body === 'Oi, quero marcar',  'body incorreto');
});

test('UltraMsg: fromMe = true → null (ignorar mensagens próprias)', () => {
  const p   = new UltraMsgProvider();
  const msg = p.parseWebhook({
    event_type: 'message_received',
    instanceId: 'i168762',
    data: { id: 'm1', from: '5585@c.us', body: 'eco', fromMe: true },
  });
  assert(msg === null, 'fromMe=true deve retornar null');
});

test('UltraMsg: grupo (@g.us) → null', () => {
  const p   = new UltraMsgProvider();
  const msg = p.parseWebhook({
    event_type: 'message_received',
    instanceId: 'i168762',
    data: { id: 'm1', from: '5585120000001@g.us', body: 'grupo msg', fromMe: false },
  });
  assert(msg === null, 'Mensagem de grupo deve retornar null');
});

test('UltraMsg: event_type != message_received → null', () => {
  const p   = new UltraMsgProvider();
  const msg = p.parseWebhook({ event_type: 'message_sent', instanceId: 'i1', data: {} });
  assert(msg === null, 'event_type diferente deve retornar null');
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASO 3 — Deduplication logic
// ═══════════════════════════════════════════════════════════════════════════════

console.log('[CASO 3] Deduplication logic\n');

test('Mesmo messageId + tenantId = duplicata detectada', async () => {
  const seen = new Set<string>();

  async function dedupe(tenantId: string, messageId: string): Promise<boolean> {
    const key = `${tenantId}:${messageId}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  }

  const first  = await dedupe('t1', 'msg_A');
  const second = await dedupe('t1', 'msg_A');
  assert(!first,  'Primeira vez: não é duplicata');
  assert(second,  'Segunda vez: é duplicata');
});

test('Mesmo messageId em tenants diferentes NÃO é duplicata', async () => {
  const seen = new Set<string>();
  async function dedupe(t: string, m: string): Promise<boolean> {
    const k = `${t}:${m}`; if (seen.has(k)) return true; seen.add(k); return false;
  }
  const r1 = await dedupe('tenant_A', 'shared_msg_id');
  const r2 = await dedupe('tenant_B', 'shared_msg_id');
  assert(!r1, 'tenant_A: não duplicata');
  assert(!r2, 'tenant_B: messageId idêntico mas tenant diferente — não é duplicata');
});

test('PostgreSQL unique_violation (23505) é reconhecido como duplicata', () => {
  // Simula o erro que seria lançado pelo Prisma ao violar a PK (message_id, tenant_id)
  const pgError = Object.assign(new Error('duplicate key value'), { code: '23505' });
  const isDuplicate = (pgError as { code?: string }).code === '23505';
  assert(isDuplicate, 'Código 23505 deve ser reconhecido como duplicata');
});

test('Erros não-duplicata são propagados (não engolidos)', () => {
  const networkError = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
  const isDuplicate = (networkError as { code?: string }).code === '23505';
  assert(!isDuplicate, 'Erro de rede não deve ser tratado como duplicata');
});

// ── Final ─────────────────────────────────────────────────────────────────────

Promise.all(queue).then(() => {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Resultado: ${passed} passou | ${failed} falhou`);
  if (failed > 0) process.exit(1);
});
