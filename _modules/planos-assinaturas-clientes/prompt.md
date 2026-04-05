# Prompt: Implementar planos-assinaturas-clientes

Implementar clube de assinaturas para clientes em um projeto Next.js 14+ com Prisma e TypeScript.
NÃO quebrar nada existente. Leia os arquivos relevantes antes de começar.

---

## STACK ASSUMIDA
- Next.js App Router
- Prisma 5 + PostgreSQL
- TypeScript
- Módulos auth-multitenant e agenda-multiprofissional já instalados
- Stripe (opcional — para cobrança automática)

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS
```
STRIPE_SECRET_KEY=sk_test_xxxx (opcional — se omitido, funciona sem cobrança automática)
STRIPE_WEBHOOK_SECRET=whsec_xxxx (obrigatório se usar Stripe)
```

---

## PASSO 1 — SCHEMA PRISMA
Adicionar ao `prisma/schema.prisma`:

```prisma
model PlanoAssinatura {
  id                     String   @id @default(cuid())
  empresaId              String
  tenantId               String
  nome                   String
  descricao              String?
  valor                  Float
  periodicidade          String
  servicos               Json
  ativo                  Boolean  @default(true)
  isTemplate             Boolean  @default(false)
  templateTipo           String?
  stripePriceId          String?
  agendamentoPrioritario Boolean  @default(false)
  descontoProdutos       Float?
  descontoServicosExtras Float?
  assinantes             AssinaturaCliente[]
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  @@map("planos_assinatura")
}

model AssinaturaCliente {
  id               String    @id @default(cuid())
  pacienteId       String
  planoId          String
  tenantId         String
  dataInicio       DateTime  @default(now())
  dataFim          DateTime?
  status           String    @default("ativo")
  valorPago        Float
  stripeSubId      String?
  stripeCustomerId String?
  proximaCobranca  DateTime?
  ultimaCobranca   DateTime?
  contadorUso      Json      @default("{}")
  periodoInicio    DateTime  @default(now())
  periodoFim       DateTime?
  plano            PlanoAssinatura @relation(fields: [planoId], references: [id])
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  @@map("assinaturas_cliente")
}
```

Rodar: `npx prisma db push`

---

## PASSO 2 — TEMPLATES PRONTOS (`src/lib/planos-templates.ts`)
Criar arquivo com os templates pré-configurados:

```typescript
export const PLANOS_TEMPLATES = {
  basico: {
    templateTipo: 'basico',
    nome: 'Plano Essencial',
    descricao: 'Ideal para começar',
    valor: 89.90,
    periodicidade: 'mensal',
    agendamentoPrioritario: false,
    descontoProdutos: null,
    descontoServicosExtras: 5,
    servicos: [],
    preview: {
      titulo: 'Plano Essencial',
      exemplo: ['2× por serviço por mês', '5% OFF em serviços extras'],
    },
  },
  premium: {
    templateTipo: 'premium',
    nome: 'Plano Premium',
    descricao: 'O mais escolhido',
    valor: 149.90,
    periodicidade: 'mensal',
    agendamentoPrioritario: true,
    descontoProdutos: 10,
    descontoServicosExtras: 10,
    servicos: [],
    preview: {
      titulo: 'Plano Premium',
      exemplo: ['4× por serviço por mês', 'Agendamento prioritário', '10% OFF em extras'],
    },
  },
  vip: {
    templateTipo: 'vip',
    nome: 'Plano VIP',
    descricao: 'Para clientes especiais',
    valor: 249.90,
    periodicidade: 'mensal',
    agendamentoPrioritario: true,
    descontoProdutos: 20,
    descontoServicosExtras: 15,
    servicos: [],
    preview: {
      titulo: 'Plano VIP',
      exemplo: ['Serviços ilimitados', '20% OFF em produtos', '15% OFF em extras'],
    },
  },
};
```

---

## PASSO 3 — ROTAS DE PLANOS

### `src/app/api/subscriptions/planos/route.ts`
**GET**: buscar com `_count: { assinantes: { where: { status: 'ativo' } } }`
**POST**:
1. Validar nome e valor
2. Criar price no Stripe se configurado:
   ```typescript
   const interval = periodicidade === 'anual' ? 'year' : 'month';
   const price = await stripe.prices.create({
     unit_amount: Math.round(valor * 100),
     currency: 'brl',
     recurring: { interval },
     product_data: { name: `${nome} — Assinatura Cliente` },
   });
   ```
3. Criar PlanoAssinatura com stripePriceId

### `src/app/api/subscriptions/planos/ativar-template/route.ts`
**POST**:
1. Buscar `PLANOS_TEMPLATES[templateTipo]`
2. Injetar serviços reais (passados no body) no template
3. Criar PlanoAssinatura com `isTemplate: true`

---

## PASSO 4 — ROTAS DE CLIENTES

### `src/app/api/subscriptions/clientes/route.ts`
**POST** — criar assinatura:
1. Verificar que plano pertence ao tenant
2. Calcular periodoFim conforme periodicidade
3. Inicializar contadorUso:
   ```typescript
   const servicosPlano = Array.isArray(plano.servicos) ? plano.servicos as any[] : [];
   const contadorUso: Record<string, { usado: number; limite: number | null }> = {};
   for (const s of servicosPlano) {
     contadorUso[s.servicoId] = {
       usado: 0,
       limite: s.tipo === 'ilimitado' ? null : (s.quantidade ?? null),
     };
   }
   ```
4. Criar customer e subscription no Stripe se configurado
5. Criar AssinaturaCliente
6. Atualizar `isSubscriber: true` no cliente

### `src/app/api/subscriptions/clientes/[id]/uso/route.ts`
**PATCH** — registrar uso:
1. Verificar assinatura ativa e no período vigente
2. Buscar serviço no `contadorUso`
3. Verificar `contador.usado < contador.limite` (ou limite=null)
4. Incrementar e salvar com `prisma.assinaturaCliente.update({ data: { contadorUso: novoContador } })`

---

## PASSO 5 — WEBHOOK STRIPE

### `src/app/api/subscriptions/webhook/route.ts`
Processar eventos Stripe para renovação automática:
- `invoice.paid`: resetar contadores, atualizar datas
- `customer.subscription.deleted`: cancelar
- `invoice.payment_failed`: suspender

---

## ORDEM DE EXECUÇÃO
1. Adicionar schema e rodar `npx prisma db push`
2. Criar `src/lib/planos-templates.ts`
3. Criar rotas de planos (GET, POST, ativar-template)
4. Criar rotas de clientes (GET, POST, uso)
5. Criar `/api/subscriptions/verificar`
6. Criar webhook Stripe (se usar Stripe)

---

## REGRAS CRÍTICAS
- SEMPRE verificar que o plano pertence ao tenant antes de criar assinatura
- NUNCA incrementar contador além do limite
- Limite null = ilimitado (não bloquear)
- Verificar `periodoFim > now()` antes de permitir uso
- Renovação de período deve RESETAR os contadores de uso (não acumular)
- `isSubscriber` no cliente deve ser atualizado ao ativar/cancelar assinatura
