# Prompt: Implementar whatsapp-marketing

Implementar módulo de automação de marketing via WhatsApp em um projeto Next.js 14+ com Prisma e TypeScript.
NÃO quebrar nada existente. Leia os arquivos relevantes antes de começar.

---

## STACK ASSUMIDA
- Next.js App Router
- Prisma 5 + PostgreSQL
- TypeScript
- Módulo auth-multitenant já instalado (middleware injeta x-tenant-id)

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS
```
WASENDER_BASE_URL=https://wasenderapi.com/api
WASENDER_DEMO_API_KEY=bearer_token_da_instancia_demo
WASENDER_DEMO_PHONE=5511999999999
MARKETING_DEMO_MODE=false
```

---

## PASSO 1 — SCHEMA PRISMA
Adicionar ao `prisma/schema.prisma`:

```prisma
enum WhatsappStatus {
  LIVRE
  EM_USO
  DEMO
  OFFLINE
  AGUARDANDO
}

enum WhatsappPlataforma {
  WASENDERAPI
  ULTRAMSG
}

model WhatsappInstance {
  id          String             @id @default(cuid())
  empresaId   String?
  sessionId   String             @unique
  bearerToken String
  numeroWa    String?
  status      WhatsappStatus     @default(LIVRE)
  plataforma  WhatsappPlataforma @default(WASENDERAPI)
  webhookUrl  String?
  observacoes String?
  criadoEm    DateTime           @default(now())
  conectadoEm DateTime?
  ultimoPing  DateTime?
  @@map("whatsapp_instances")
}

model MarketingConfig {
  id                        String   @id @default(uuid())
  tenantId                  String   @unique
  wasenderApiKey            String?
  wasenderSessionId         String?
  lembreteAtivo             Boolean  @default(true)
  lembreteAntecedenciaHoras Int      @default(24)
  lembreteHorario           String   @default("09:00")
  lembreteTemplate          String?
  aniversarioAtivo          Boolean  @default(true)
  aniversarioHorario        String   @default("08:00")
  aniversarioDescontoPct    Int      @default(15)
  aniversarioTemplate       String?
  linkConfirmacao           String?
  nomeEmpresa               String?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  @@map("marketing_configs")
}

model MarketingCombo {
  id               String   @id @default(uuid())
  tenantId         String
  nome             String
  descricao        String?
  servicos         String[]
  gatilhoServico   String?
  precoOriginal    Decimal? @db.Decimal(10, 2)
  precoCombo       Decimal  @db.Decimal(10, 2)
  descontoPct      Int?
  ativo            Boolean  @default(true)
  validadeDias     Int      @default(30)
  templateWhatsapp String?
  createdAt        DateTime @default(now())
  envios           MarketingEnvio[]
  @@map("marketing_combos")
}

model MarketingEnvio {
  id              String    @id @default(uuid())
  tenantId        String
  tipo            String
  clienteNome     String?
  clienteTelefone String
  mensagemEnviada String?
  comboId         String?
  wasenderMsgId   String?
  status          String    @default("enviado")
  erroDetalhe     String?
  enviadoEm       DateTime  @default(now())
  combo           MarketingCombo? @relation(fields: [comboId], references: [id])
  @@map("marketing_envios")
}

model MarketingCampanha {
  id                 String    @id @default(uuid())
  tenantId           String
  nome               String
  tipo               String?
  filtroServico      String?
  filtroInativoDias  Int?
  template           String
  totalDestinatarios Int       @default(0)
  totalEnviados      Int       @default(0)
  totalErros         Int       @default(0)
  status             String    @default("rascunho")
  agendadoPara       DateTime?
  criadoEm           DateTime  @default(now())
  concluidoEm        DateTime?
  @@map("marketing_campanhas")
}
```

Rodar: `npx prisma db push`

---

## PASSO 2 — LIB WASENDER (`src/lib/wasender.ts`)
Criar o wrapper para a API WaSender e UltraMsg:

```typescript
const WASENDER_BASE = process.env.WASENDER_BASE_URL || 'https://wasenderapi.com/api';

export function getWasenderConfig(clinicaApiKey?: string | null) {
  const demoKey = process.env.WASENDER_DEMO_API_KEY ?? '';
  if (process.env.MARKETING_DEMO_MODE === 'true') return { apiKey: demoKey, isDemo: true };
  if (clinicaApiKey) return { apiKey: clinicaApiKey, isDemo: false };
  return { apiKey: demoKey, isDemo: true };
}

export async function wasenderPost(bearerToken: string, path: string, body?: object) {
  const res = await fetch(`${WASENDER_BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function sendWhatsAppMessage(
  plataforma: string, sessionId: string, bearerToken: string, to: string, message: string
) {
  if (plataforma === 'ULTRAMSG') {
    const res = await fetch(`https://api.ultramsg.com/${sessionId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: bearerToken, to, body: message }).toString(),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }
  return wasenderPost(bearerToken, '/messages/send', { to, message });
}
```

---

## PASSO 3 — HELPER DE ENVIO (`src/lib/marketing-helpers.ts`)
Criar helper que envia e registra no log:

```typescript
// sendAndLog: envia mensagem e registra em MarketingEnvio
// Determina automaticamente qual instância usar para o tenant
async function sendAndLog({ tenantId, tipo, clienteNome, clienteTelefone, mensagemEnviada, comboId }) {
  // 1. Buscar MarketingConfig para obter API Key própria
  // 2. Buscar WhatsappInstance EM_USO para o tenant
  // 3. Determinar qual instância/key usar (própria > demo)
  // 4. Enviar via sendWhatsAppMessage
  // 5. Criar MarketingEnvio com status e eventuais erros
}
```

---

## PASSO 4 — UTILS DE TEMPLATE (`src/lib/marketing-utils.ts`)
```typescript
export const TEMPLATE_LEMBRETE_PADRAO = `Olá {{nome}}! 🗓️
Lembrando do seu agendamento{{profissional_linha}} amanhã, {{data}} às {{hora}}.
Serviço: {{servico}}
{{clinica}}
{{link}}`;

export function processarTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}
```

---

## PASSO 5 — ROTAS DA API

### `src/app/api/marketing/config/route.ts`
- GET: upsert config + buscar instância + mascarar API Key + determinar `_instanciaStatus`
- PATCH: whitelist de campos permitidos + ignorar campos mascarados

### `src/app/api/marketing/send-lembrete/route.ts`
- POST: buscar agendamento → montar mensagem → `sendAndLog`

### `src/app/api/marketing/send-aniversario/route.ts`
- POST: buscar paciente → montar mensagem de aniversário → `sendAndLog`

### `src/app/api/marketing/combos/route.ts`
- GET: listar combos do tenant
- POST: criar combo com validação de campos obrigatórios

### `src/app/api/marketing/campanhas/route.ts`
- GET: listar campanhas
- POST: criar campanha com status "rascunho"

### `src/app/api/marketing/campanhas/[id]/dispatch/route.ts`
- POST: buscar destinatários conforme tipo → enviar em loop → atualizar contadores

---

## ORDEM DE EXECUÇÃO
1. Adicionar schema e rodar `npx prisma db push`
2. Criar `src/lib/wasender.ts`
3. Criar `src/lib/marketing-utils.ts`
4. Criar `src/lib/marketing-helpers.ts`
5. Criar as rotas de API
6. Configurar variáveis de ambiente
7. Testar conexão com `/api/marketing/testar-conexao`

---

## REGRAS CRÍTICAS
- NUNCA retornar `bearerToken` das WhatsappInstances em nenhuma resposta
- NUNCA retornar a API Key completa da empresa — mascarar com `•` exceto os últimos 4 chars
- SEMPRE filtrar por `tenantId` em todas as queries
- O modo DEMO nunca envia para o cliente real — envia para `WASENDER_DEMO_PHONE`
- Rate limiting: implementar delay entre envios em campanhas grandes para evitar bloqueio
- Templates: escapar variáveis antes de enviar (evitar injection de quebras de linha maliciosas)
