# Prompt: Implementar financeiro

Implementar módulo financeiro completo em um projeto Next.js 14+ com Prisma e TypeScript.
NÃO quebrar nada existente. Leia os arquivos relevantes antes de começar.

---

## STACK ASSUMIDA
- Next.js App Router
- Prisma 5 + PostgreSQL
- TypeScript
- Módulos auth-multitenant e agenda-multiprofissional já instalados

---

## PASSO 1 — SCHEMA PRISMA
Adicionar ao `prisma/schema.prisma`:

```prisma
model TransacaoFinanceira {
  id             String    @id @default(uuid())
  tenantId       String
  tipo           String    @default("income")
  status         String    @default("pending")
  valor          Float     @default(0.0)
  descricao      String?
  categoria      String?   @default("Geral")
  agendamentoId  String?   @unique
  formaPagamento String?
  parcelas       Int?      @default(1)
  contaBancaria  String?
  profissionalId String?
  convenioId     String?
  observacao     String?
  dataVencimento DateTime?
  dataPagamento  DateTime?
  numeroRecibo   String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@map("transacoes_financeiras")
}

model RepasseProfissional {
  id             String    @id @default(uuid())
  tenantId       String
  profissionalId String
  periodo        String
  totalBruto     Float     @default(0)
  percentual     Float     @default(0)
  totalRepasse   Float     @default(0)
  status         String    @default("pendente")
  pago_em        DateTime?
  observacao     String?
  createdAt      DateTime  @default(now())
  @@unique([tenantId, profissionalId, periodo])
  @@map("repasses_profissional")
}
```

Rodar: `npx prisma db push`

---

## PASSO 2 — HELPER DE SESSÃO
Verificar que `src/lib/auth-helpers.ts` existe com a função `getSessionInfo()`:
```typescript
export async function getSessionInfo() {
  const h = await headers();
  return {
    tenantId: h.get('x-tenant-id') || '',
    userId: h.get('x-user-id') || '',
    role: h.get('x-user-role') || '',
    profissionalId: h.get('x-profissional-id') || undefined,
  };
}
```

---

## PASSO 3 — ROTA DE RESUMO (`src/app/api/finance/resumo/route.ts`)

Funções auxiliares necessárias:
```typescript
function periodoRange(periodo: string) {
  const [ano, mes] = periodo.split('-').map(Number);
  return {
    inicio: new Date(ano, mes - 1, 1),
    fim: new Date(ano, mes, 0, 23, 59, 59, 999),
  };
}

function periodoAnterior(periodo: string) {
  const [ano, mes] = periodo.split('-').map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

Lógica do GET:
1. Calcular período atual e anterior
2. Buscar transações do período atual (com include de profissional)
3. Calcular: receitaBruta, despesasTotal, lucroLiquido, ticketMedio, variacaoReceita
4. Agrupar receitas por convênio e forma de pagamento
5. Agrupar despesas por categoria
6. Calcular a receber e a pagar (status=pending)
7. Buscar repasses do período
8. Calcular receita e repasse por profissional
9. Gerar evolução dos últimos 6 meses (loop com query por mês)

Adicionar `export const dynamic = 'force-dynamic'` ao final.

---

## PASSO 4 — ROTA DE TRANSAÇÕES (`src/app/api/finance/transacoes/route.ts`)

### GET com paginação e filtros
Filtros disponíveis: tipo, categoria, profissionalId, convenioId, formaPagamento, status, dataInicio, dataFim, q (busca por descrição), page, limit.

Profissional só vê as próprias: `if (role === 'profissional' && profissionalId) where.profissionalId = profissionalId`

### POST com geração de recibo
```typescript
// Gerar número de recibo
const anoMes = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}`;
const count = await prisma.transacaoFinanceira.count({
  where: { tenantId, numeroRecibo: { startsWith: `REC-${anoMes}-` } },
});
const numeroRecibo = `REC-${anoMes}-${String(count + 1).padStart(3, '0')}`;
```

---

## PASSO 5 — REPASSES (`src/app/api/finance/repasses/`)

### calcular/route.ts (POST)
1. Buscar profissionais ativos do tenant
2. Buscar agendamentos do período com include de servico
3. Para cada profissional: somar preços dos serviços dos agendamentos
4. Calcular repasse: `repasseTipo=fixo ? repasseFixo : totalBruto * percentual / 100`
5. Upsert em RepasseProfissional

### [id]/route.ts (PATCH)
Se status=pago: `pago_em: new Date()`

---

## ORDEM DE EXECUÇÃO
1. Adicionar schema e rodar `npx prisma db push`
2. Verificar/criar `src/lib/auth-helpers.ts`
3. Criar `src/app/api/finance/resumo/route.ts`
4. Criar `src/app/api/finance/transacoes/route.ts`
5. Criar `src/app/api/finance/transacoes/[id]/route.ts`
6. Criar `src/app/api/finance/repasses/route.ts`
7. Criar `src/app/api/finance/repasses/calcular/route.ts`
8. Criar `src/app/api/finance/repasses/[id]/route.ts`
9. Criar `src/app/api/finance/recibo/[id]/route.ts`

---

## REGRAS CRÍTICAS
- SEMPRE filtrar por `tenantId` em todas as queries
- Profissional NUNCA pode criar transações (retornar 403)
- Profissional só vê suas próprias transações no GET
- Ao calcular evolução histórica: usar `status: { not: 'canceled' }` para excluir canceladas
- Separar despesas fixas (aluguel, salario, despesa_fixa) das variáveis no cálculo
- Número de recibo deve ser sequencial por mês: `REC-YYYYMM-001`, `REC-YYYYMM-002`, etc.
