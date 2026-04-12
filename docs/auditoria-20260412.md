# Auditoria Synka — 2026-04-12

> Diagnóstico: somente leitura. Nenhum arquivo foi alterado.
> Rotas auditadas: ~190 route.ts em src/app/api/

---

## CRÍTICO (quebra em produção ou expõe dados)

### C-1 — Secret hardcoded `13201320` em 3 rotas admin
- `src/app/api/admin/metrics/route.ts:8` — `secret !== '13201320'`
- `src/app/api/admin/tenants/route.ts:4` — `const SECRET = '13201320'`
- `src/app/api/admin/tenants/[id]/route.ts:4` — `const SECRET = '13201320'`

Qualquer pessoa com acesso ao repositório (ou que adivinhar a chave) consegue:
- Listar **todas as clínicas** com contagens de agendamentos, profissionais, pacientes
- Ver/editar qualquer tenant individualmente
- Ver métricas de toda a plataforma

A chave nunca passa pelo middleware JWT — as rotas `/api/admin/*` são isentas do middleware.
**Ação**: Migrar para `requireSynkaAdmin()` + JWT, ou ao menos `process.env.ADMIN_SECRET`.

---

### C-2 — CRON_SECRET opcional: crons executáveis por qualquer um
- `src/app/api/cron/lembretes/route.ts:18` — `if (secret && auth !== secret)`
- `src/app/api/cron/marketing-daily/route.ts:9` — `if (secret && auth !== secret)`

Se `CRON_SECRET` não estiver definido na Vercel, **qualquer requisição GET passa sem autenticação**.
Consequência: qualquer pessoa pode forçar envio de mensagens WhatsApp em massa para todos os tenants.
**Ação**: Tornar obrigatório: `if (!secret || auth !== secret) return 401`.

---

### C-3 — N8N API key hardcoded no workflow JSON
- `n8n/ai-agent-dynamic-flow.json:43,108,131,...` — `"value": "synka@2026"` (7+ ocorrências)
- Chave também aparece em query params: `?_key=synka@2026` (exposta em logs HTTP do servidor)

Qualquer pessoa com acesso ao repositório tem a chave. Como o repositório está versionado no GitHub, a chave está no histórico permanentemente.
**Ação imediata**: Rotacionar `N8N_API_KEY` para um valor forte gerado aleatoriamente. Atualizar o workflow. Usar variável de credencial no N8N em vez de valor inline.

---

### C-4 — Rotas admin sem try/catch (falham com 500 não tratado)
- `src/app/api/admin/whatsapp/dashboard/route.ts`
- `src/app/api/admin/whatsapp/route.ts`
- `src/app/api/admin/whatsapp/[id]/qrcode/route.ts`
- `src/app/api/admin/whatsapp/[id]/vincular/route.ts`

Erros de banco ou rede lançam exceção não capturada — o Next.js retorna stack trace em alguns ambientes.

---

## ALTO (pode causar bugs graves ou abuso)

### A-1 — Status `em_atendimento` e `faltou` não documentados no schema
- Schema: `status String @default("pendente") // confirmado, pendente, cancelado, done`
- Usado no código: `src/app/api/appointments/hoje/route.ts:101` — `['pendente', 'confirmado', 'em_atendimento', 'done', 'cancelado', 'faltou']`
- Adicionados no frontend (`appointments/page.tsx`) mas o comentário do schema está desatualizado

O campo é `String` (não enum), então funciona, mas sem enum o banco aceita qualquer typo.
Queries que filtram por status fixo (ex: cron que só pega `pendente`) podem perder agendamentos `faltou`.
**Ação**: Migrar para `enum AgendamentoStatus` no schema, ou ao menos atualizar o comentário e garantir que todas as queries cubram todos os status relevantes.

---

### A-2 — Rota pública de agendamento sem rate limiting
- `src/app/api/public/clinic/[slug]/agendar/route.ts` — POST público, sem limite
- `src/app/api/public/clinic/[slug]/slots/route.ts` — GET público, sem cache

Qualquer script pode criar centenas de agendamentos falsos ou enumerar toda a agenda.
**Ação**: Adicionar limite por IP (ex: 10 req/min) usando Vercel Edge config ou middleware.

---

### A-3 — `/api/cron/lembretes/pendentes` retorna dados sensíveis de todos os tenants
- `src/app/api/cron/lembretes/pendentes/route.ts` — retorna nome, telefone e tenantId de pacientes de **toda a plataforma** (sem filtro de tenant)
- Protegida por `autenticarApiKey` (N8N_API_KEY) — OK se a chave for segura
- Mas com C-3 (chave "synka@2026" exposta), qualquer um consegue acessar

---

### A-4 — Webhook UltraMsg sem validação de origem
- `src/app/api/webhook/ultramsg/route.ts` — aceita qualquer POST
- Não verifica IP de origem nem token/secret do UltraMsg
- Um atacante pode enviar eventos falsos e forçar o bot a processar mensagens arbitrárias
**Ação**: Verificar header `ultra-signature` ou restringir por IP das instâncias UltraMsg.

---

### A-5 — `/api/admin/ops/route.ts` sem autenticação alguma
- Expõe métricas de servidor: uso de memória, versão, uptime, latência de banco
- Qualquer pessoa pode acessar via GET
- Embora não exponha dados de clientes, revela informações da infraestrutura

---

## MÉDIO (degradação de qualidade ou riscos menores)

### M-1 — Variáveis de ambiente não documentadas em uso
Usadas no código mas ausentes do `CLAUDE.md` (seção "Environment Variables"):
- `ANTHROPIC_API_KEY` — usado em `src/app/api/chat/route.ts`
- `ENCRYPTION_KEY` — usado em `src/lib/` (provavelmente prontuário/documentos)
- `N8N_INTERNAL_TOKEN` — usado em `src/lib/n8n-auth.ts`
- `CRON_SECRET` — obrigatório para segurança (ver C-2)
- `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_BUSINESS` — planos adicionais
- `STRIPE_PRICE_ADDON_WA`, `STRIPE_PRICE_ADDON_IA`, `STRIPE_PRICE_ADDON_SETUP` — add-ons
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — login Google
- `EMAIL_FROM`, `WASENDER_N8N_WEBHOOK_URL`, `WASENDER_DEMO_PHONE`
- `N8N_WEBHOOK_URL`

---

### M-2 — `/api/debug/agenda` em produção
- `src/app/api/debug/agenda/route.ts` — comentário diz "rota temporária de diagnóstico"
- Protegida por JWT (tenantId extraído do token) — não é pública
- Mas expõe estrutura interna de escalas e configurações de agenda para qualquer usuário autenticado
**Ação**: Remover ou restringir a `synka_admin`.

---

### M-3 — `amanhaFim.setUTCHours(26, 59, 59, 999)` — código confuso mas funcional
- `src/app/api/cron/lembretes/pendentes/route.ts:23`
- `setUTCHours(26)` transborda para o dia seguinte (JS aceita valores > 23)
- Funciona corretamente mas é ilegível. Deveria ser `setUTCHours(3+24-1)` ou lógica explícita.

---

### M-4 — Credenciais demo em plain text no seed
- `prisma/seed.ts` — senhas `Demo@2026` visíveis no repositório
- Tenants: `demo-synka-master`, `demo-barbearia`, `demo-estetica`, `demo-salao`
- Risco baixo se o banco demo for separado, mas preocupante se compartilhar banco com produção

---

### M-5 — `_key` em query param expõe chave nos logs HTTP
- URLs como `?_key=synka@2026` aparecem em logs de acesso do servidor e Vercel
- N8N usa este padrão em 7+ chamadas (ver C-3)
- Preferir sempre header `x-api-key` para não expor em logs

---

### M-6 — Falta .env.example atualizado
- Não existe `.env.example` ou está desatualizado (não auditado diretamente)
- Novos desenvolvedores não têm referência de quais variáveis são necessárias
- Risco: subir para produção sem variáveis críticas (ex: CRON_SECRET vazio → C-2)

---

## BAIXO (nice to have)

### B-1 — Apenas 1 cron na Vercel (pode perder lembretes)
- `vercel.json` tem apenas `/api/cron/lembretes` às 11h UTC (8h Fortaleza), 1x/dia
- Clínicas com `lembreteAntecedenciaHoras = 2` (2h antes) nunca recebem lembretes via cron Vercel
- O cron do N8N (`/api/cron/lembretes/pendentes`) é chamado separadamente — depende do N8N estar ativo

---

### B-2 — Rate limiting só existe no marketing
- `src/lib/marketing-antiaban.ts` — anti-ban e rate limit apenas para WhatsApp marketing
- Rotas de appointments, patients, team não têm rate limiting
- Mitigado parcialmente pelo JWT (exige autenticação)

---

### B-3 — `toLocaleDateString/toLocaleTimeString` sem timezone em send-lembrete
- `src/app/api/marketing/send-lembrete/route.ts:31-32` — usa `toLocaleDateString('pt-BR')` e `toLocaleTimeString` sem `timeZone`
- Em produção (servidor UTC), as horas aparecem em UTC, não Fortaleza
- Ex: agendamento 14h Fortaleza (17h UTC) apareceria como "17:00" no lembrete

---

## OK (funcionando corretamente)

- [x] Middleware JWT protege todas as rotas não listadas em API_PUBLICAS
- [x] Todas as rotas com `await prisma` têm try/catch (exceto as 4 admin/whatsapp)
- [x] Timezone `America/Fortaleza` usado consistentemente (zero ocorrências de Sao_Paulo)
- [x] Stripe webhook valida assinatura HMAC-SHA256 (`constructEvent`)
- [x] `sendAndLog` verifica `data.sent === 'true'` do UltraMsg (corrigido em 2026-04-12)
- [x] `lembreteEnviado = true` só marca após confirmação real do envio (corrigido em 2026-04-12)
- [x] Anti-ban delay 3s entre envios no cron
- [x] Horário seguro 8h-21h Fortaleza no marketing
- [x] Cross-tenant: todas as queries críticas filtram por `tenantId`
- [x] N8N workflow aponta para `synka.somar.ia.br` (sem localhost ou preview)
- [x] Rotas `/api/n8n/agenda/*` protegidas por `autenticarApiKey`
- [x] Rotas `/api/n8n/appointments/*` protegidas por `autenticarTokenInterno`
- [x] `/api/whatsapp-send`, `/api/whatsapp-connected`, `/api/whatsapp-disconnected` protegidas por `validateN8nKey`
- [x] `tenantId` sempre extraído do header JWT (nunca do body)
- [x] Zero URLs hardcoded (localhost/vercel) no código fonte

---

## Resumo de prioridades

| # | Severidade | Item | Arquivo(s) |
|---|-----------|------|-----------|
| C-1 | CRÍTICO | Secret `13201320` hardcoded — expõe todos os tenants | admin/metrics, admin/tenants, admin/tenants/[id] |
| C-2 | CRÍTICO | CRON_SECRET opcional — crons executáveis sem auth | cron/lembretes, cron/marketing-daily |
| C-3 | CRÍTICO | N8N_API_KEY `synka@2026` no JSON versionado | n8n/ai-agent-dynamic-flow.json |
| C-4 | CRÍTICO | 4 rotas admin sem try/catch | admin/whatsapp/* |
| A-1 | ALTO | Status em_atendimento/faltou sem enum no schema | schema.prisma |
| A-2 | ALTO | Rota pública de agendamento sem rate limiting | public/clinic/[slug]/agendar |
| A-3 | ALTO | cron/lembretes/pendentes expõe dados cross-tenant | cron/lembretes/pendentes |
| A-4 | ALTO | Webhook UltraMsg sem validação de origem | webhook/ultramsg |
| A-5 | ALTO | admin/ops sem autenticação | admin/ops |
| M-1 | MÉDIO | Variáveis de ambiente não documentadas | CLAUDE.md / .env.example |
| M-2 | MÉDIO | Rota debug em produção | debug/agenda |
| M-3 | MÉDIO | setUTCHours(26) — código confuso | cron/lembretes/pendentes |
| M-4 | MÉDIO | Credenciais demo em plain text | prisma/seed.ts |
| M-5 | MÉDIO | _key em query param expõe chave em logs | n8n workflow URLs |
| M-6 | MÉDIO | .env.example desatualizado | — |
| B-1 | BAIXO | 1 cron/dia pode perder lembretes de 2h | vercel.json |
| B-2 | BAIXO | Rate limiting apenas no marketing | — |
| B-3 | BAIXO | send-lembrete: hora sem timezone no template | marketing/send-lembrete |
