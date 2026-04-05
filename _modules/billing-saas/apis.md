# APIs — billing-saas

---

## `GET /api/billing/planos`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
```json
{
  "planos": {
    "trial": { "id": "trial", "nome": "Trial 15 Dias", "precoBRL": 0, "features": ["string"] },
    "solo": { "id": "solo", "nome": "Plano Solo", "precoBRL": 79, "stripePriceId": "price_xxx", "features": ["string"] },
    "pro": { "id": "pro", "nome": "Plano Pro", "precoBRL": 127, "stripePriceId": "price_xxx", "features": ["string"] },
    "business": { "id": "business", "nome": "Plano Business", "precoBRL": 197, "stripePriceId": "price_xxx", "features": ["string"] }
  },
  "upsells": {
    "whatsapp_extra": { "id": "whatsapp_extra", "nome": "WhatsApp Adicional", "precoBRL": 49, "tipo": "mensal" },
    "automacao_ia": { "id": "automacao_ia", "nome": "Automação com IA", "precoBRL": 49, "tipo": "mensal" },
    "setup": { "id": "setup", "nome": "Setup Inicial", "precoBRL": 97, "tipo": "unico" }
  },
  "assinatura": {
    "plano": "string",
    "status": "string",
    "trialFim": "DateTime | null",
    "proximoVencimento": "DateTime | null"
  }
}
```

### Lógica
Retorna os planos configurados em `planos.ts` + assinatura atual do tenant.

---

## `POST /api/billing/checkout`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "plano": "solo | pro | business",
  "upsells": ["string? — IDs dos addons desejados"]
}
```

### Response 200
```json
{
  "url": "string — URL da sessão de checkout Stripe"
}
```

### Lógica
1. Validar plano (não pode ser trial)
2. Buscar ou criar `stripeCustomerId` para o tenant
3. Montar `lineItems` com o plano + addons selecionados
4. Criar `stripe.checkout.sessions.create` com:
   - `mode: 'subscription'`
   - `success_url`, `cancel_url`
   - `metadata: { tenantId, plano, upsells }`
5. Retornar URL da sessão

### Erros
- `400` — plano inválido ou trial selecionado
- `401` — sem autenticação
- `404` — empresa não encontrada

---

## `POST /api/billing/portal`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
Sem body.

### Response 200
```json
{
  "url": "string — URL do portal de gerenciamento Stripe"
}
```

### Lógica
1. Buscar `stripeCustomerId` na assinatura do tenant
2. Criar `stripe.billingPortal.sessions.create` com `return_url`
3. Retornar URL do portal

### Erros
- `400` — sem assinatura ativa para gerenciar

---

## `POST /api/billing/cancelar`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
Sem body.

### Response 200
```json
{ "ok": true }
```

### Lógica
1. Buscar `stripeSubId` na assinatura do tenant
2. Chamar `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
3. Atualizar status para `canceling` no banco

### Observação
O acesso é mantido até o fim do período já pago. O webhook `customer.subscription.deleted`
finaliza o cancelamento quando o período terminar.

---

## `POST /api/billing/webhook`
**Autenticação:** Stripe-Signature header
**Role:** N/A (rota pública — bypass no middleware)

### Eventos processados

#### `checkout.session.completed`
```
session.metadata.tenantId → atualizar Assinatura:
  stripeSubId = session.subscription
  plano = session.metadata.plano
  status = 'active'
```

#### `invoice.paid`
```
sub = stripe.subscriptions.retrieve(invoice.subscription)
Assinatura.updateMany({ where: { stripeSubId: sub.id } }):
  status = 'active'
  proximoVencimento = new Date(sub.current_period_end * 1000)
```

#### `customer.subscription.deleted`
```
Assinatura.updateMany({ where: { stripeSubId: sub.id } }):
  status = 'canceled'
```

#### `invoice.payment_failed`
```
Assinatura.updateMany({ where: { stripeSubId: subId } }):
  status = 'past_due'
```

### Lógica de segurança
Sempre verificar a assinatura do webhook com `stripe.webhooks.constructEvent(rawBody, sig, secret)`.
Retornar 400 se a assinatura for inválida.
