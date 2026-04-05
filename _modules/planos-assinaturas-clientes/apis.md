# APIs — planos-assinaturas-clientes

Todas as rotas exigem Bearer JWT. O middleware injeta `x-tenant-id`.

---

## `GET /api/subscriptions/planos`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
```json
[
  {
    "id": "string",
    "nome": "string",
    "descricao": "string | null",
    "valor": "number",
    "periodicidade": "mensal | trimestral | anual",
    "servicos": "Json — lista de serviços incluídos",
    "ativo": "boolean",
    "agendamentoPrioritario": "boolean",
    "descontoProdutos": "number | null",
    "descontoServicosExtras": "number | null",
    "_count": { "assinantes": "number — apenas status ativo" }
  }
]
```

### Lógica
Busca planos do tenant com contagem de assinantes ativos (`_count.assinantes` filtrado por status=ativo).

---

## `POST /api/subscriptions/planos`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "nome": "string",
  "descricao": "string?",
  "valor": "number",
  "periodicidade": "mensal | trimestral | anual — padrão mensal",
  "servicos": "[{ servicoId, nome, quantidade, tipo }]",
  "agendamentoPrioritario": "boolean? — padrão false",
  "descontoProdutos": "number?",
  "descontoServicosExtras": "number?"
}
```

### Response 201
Objeto do plano criado.

### Lógica
1. Validar `nome` e `valor` obrigatórios
2. Se `STRIPE_SECRET_KEY` configurado: criar `stripe.prices.create` com o valor e periodicidade
3. Criar `PlanoAssinatura` com `stripePriceId` (ou null se Stripe não configurado)
4. `empresaId` e `tenantId` = tenantId do header

---

## `GET /api/subscriptions/planos/[id]`
**Autenticação:** Bearer JWT
**Role:** todos

### Response 200
Plano completo com lista de assinantes incluída.

---

## `PATCH /api/subscriptions/planos/[id]`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
Qualquer campo editável do plano.

### Response 200
Plano atualizado.

---

## `DELETE /api/subscriptions/planos/[id]`
**Autenticação:** Bearer JWT
**Role:** admin

Soft delete: setar `ativo: false`.

---

## `POST /api/subscriptions/planos/ativar-template`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "templateTipo": "basico | premium | vip",
  "servicos": "[{ servicoId, nome, quantidade, tipo }] — serviços reais da empresa"
}
```

### Response 201
Plano criado a partir do template.

### Lógica
1. Buscar template em `PLANOS_TEMPLATES[templateTipo]`
2. Injetar os serviços reais da empresa no template
3. Criar PlanoAssinatura com `isTemplate: true` e `templateTipo`

---

## `GET /api/subscriptions/clientes`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Query params
- `planoId` — filtrar por plano específico
- `status` — ativo | cancelado | suspenso | expirado

### Response 200
```json
[
  {
    "id": "string",
    "status": "string",
    "valorPago": "number",
    "dataInicio": "DateTime",
    "proximaCobranca": "DateTime | null",
    "contadorUso": "Json",
    "periodoFim": "DateTime | null",
    "paciente": { "id": "string", "nome": "string", "telefone": "string" },
    "plano": { "id": "string", "nome": "string", "valor": "number", "periodicidade": "string", "servicos": "Json" }
  }
]
```

---

## `POST /api/subscriptions/clientes`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Request
```json
{
  "pacienteId": "string",
  "planoId": "string",
  "dataInicio": "string? — ISO, padrão now()"
}
```

### Response 201
Assinatura criada.

### Lógica
1. Verificar que o plano pertence ao tenant
2. Calcular `periodoFim` conforme periodicidade:
   - mensal: +1 mês
   - trimestral: +3 meses
   - anual: +1 ano
3. Inicializar `contadorUso`: para cada serviço do plano, criar entrada `{ usado: 0, limite: N | null }`
4. Se Stripe configurado e plano tem `stripePriceId`: criar customer + subscription no Stripe
5. Criar `AssinaturaCliente`
6. Marcar cliente como assinante (`isSubscriber: true` no modelo Cliente)

---

## `PATCH /api/subscriptions/clientes/[id]/uso`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Request
```json
{
  "servicoId": "string"
}
```

### Response 200
```json
{
  "permitido": "boolean",
  "contador": { "usado": "number", "limite": "number | null" },
  "mensagem": "string"
}
```

### Lógica
1. Buscar assinatura com plano incluído
2. Verificar que a assinatura está ativa e no período vigente
3. Verificar se o serviço está no plano
4. Verificar se `usado < limite` (ou limite=null para ilimitado)
5. Se permitido: incrementar contador e salvar
6. Retornar se foi permitido e o contador atualizado

---

## `GET /api/subscriptions/verificar`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Query params
- `pacienteId` — obrigatório
- `servicoId` — obrigatório

### Response 200
```json
{
  "temPlano": "boolean",
  "planoAtivo": {
    "id": "string",
    "nomePlano": "string",
    "servicoIncluido": "boolean",
    "usoAtual": "number",
    "limiteUso": "number | null",
    "descontoServicosExtras": "number | null"
  } | null
}
```

### Lógica
1. Buscar assinatura ativa do cliente no período vigente
2. Verificar se o serviço está incluído no plano
3. Retornar informações de uso para exibir no agendamento

---

## `POST /api/subscriptions/webhook`
**Autenticação:** Stripe-Signature header
**Role:** N/A (webhook público)

### Eventos processados
- `invoice.paid` — renovar assinatura, resetar contadores de uso, atualizar `periodoFim`
- `customer.subscription.deleted` — cancelar assinatura
- `invoice.payment_failed` — suspender assinatura

### Lógica de renovação
1. Buscar assinatura pelo `stripeSubId`
2. Resetar `contadorUso` para `{ usado: 0 }` em todos os serviços
3. Atualizar `periodoInicio`, `periodoFim`, `ultimaCobranca`, `proximaCobranca`
