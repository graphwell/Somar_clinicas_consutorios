# APIs — financeiro

Todas as rotas exigem Bearer JWT. O middleware injeta `x-tenant-id`.
Profissionais (role=profissional) só veem suas próprias transações.

---

## `GET /api/finance/resumo`
**Autenticação:** Bearer JWT
**Role:** admin

### Query params
- `periodo` — "YYYY-MM" (padrão: mês atual)

### Response 200
```json
{
  "periodo": "abril de 2026",
  "periodoKey": "2026-04",
  "receitaBruta": "number",
  "despesasTotal": "number",
  "lucroLiquido": "number",
  "ticketMedio": "number",
  "receitaBrutaAnterior": "number",
  "variacaoReceita": "number — percentual vs mês anterior",
  "receitaParticular": "number",
  "receitaConvenio": "number",
  "receitaPorConvenio": [{ "nome": "string", "total": "number", "percentual": "number" }],
  "despesasFixas": "number",
  "despesasVariaveis": "number",
  "despesasPorCategoria": [{ "categoria": "string", "total": "number" }],
  "aReceber": "number",
  "aPagar": "number",
  "repassesPendentes": "number",
  "repassesPagos": "number",
  "porProfissional": [
    {
      "id": "string",
      "nome": "string",
      "totalAtendimentos": "number",
      "receitaGerada": "number",
      "percentualRepasse": "number",
      "valorRepasse": "number"
    }
  ],
  "evolucao": [
    { "mes": "string", "periodo": "string", "receita": "number", "despesa": "number", "lucro": "number" }
  ],
  "porFormaPagamento": [{ "forma": "string", "total": "number", "percentual": "number" }]
}
```

### Lógica
1. Calcular range do período e do período anterior
2. Buscar todas as transações do período com profissional incluído
3. Calcular KPIs (receita bruta, despesas, lucro, ticket médio, variação)
4. Agrupar por categoria, convênio e forma de pagamento
5. Calcular repasses por profissional com base nos agendamentos do período
6. Gerar evolução dos últimos 6 meses (6 queries individuais)

---

## `GET /api/finance/transacoes`
**Autenticação:** Bearer JWT
**Role:** todos (profissional vê apenas as suas)

### Query params
- `tipo` — income | expense | todos
- `categoria` — filtrar por categoria
- `profissionalId` — filtrar por profissional
- `convenioId` — filtrar por convênio
- `formaPagamento` — filtrar por forma de pagamento
- `status` — pending | paid | canceled
- `dataInicio` — data inicial (YYYY-MM-DD)
- `dataFim` — data final (YYYY-MM-DD)
- `q` — busca por descrição (insensitive)
- `page` — número da página (padrão: 1)
- `limit` — itens por página (padrão: 20)

### Response 200
```json
{
  "transacoes": [
    {
      "id": "string",
      "tipo": "income | expense",
      "status": "pending | paid | canceled",
      "valor": "number",
      "descricao": "string | null",
      "categoria": "string | null",
      "formaPagamento": "string | null",
      "numeroRecibo": "string | null",
      "dataPagamento": "DateTime | null",
      "dataVencimento": "DateTime | null",
      "profissional": { "id": "string", "nome": "string" },
      "agendamento": {
        "paciente": { "nome": "string" },
        "servico": { "nome": "string" }
      }
    }
  ],
  "total": "number",
  "pages": "number",
  "page": "number"
}
```

---

## `POST /api/finance/transacoes`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao (profissional NÃO pode criar)

### Request
```json
{
  "tipo": "income | expense",
  "valor": "number",
  "descricao": "string",
  "categoria": "string? — padrão outros",
  "formaPagamento": "string?",
  "profissionalId": "string?",
  "convenioId": "string?",
  "dataVencimento": "string? — ISO",
  "dataPagamento": "string? — ISO",
  "observacao": "string?",
  "parcelas": "number? — padrão 1",
  "contaBancaria": "string?"
}
```

### Response 201
Objeto da transação criada com `profissional` incluído.

### Lógica
1. Gerar `numeroRecibo`: buscar count de recibos do mês → `REC-YYYYMM-NNN`
2. Determinar status: se `dataPagamento` informado → "paid", se expense sem pagamento → "pending"
3. Criar transação e retornar

---

## `PATCH /api/finance/transacoes/[id]`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
Qualquer campo da transação para atualizar.

### Response 200
Objeto atualizado da transação.

### Lógica
1. Verificar se transação pertence ao tenant (`where: { id, tenantId }`)
2. Atualizar campos fornecidos

---

## `DELETE /api/finance/transacoes/[id]`
**Autenticação:** Bearer JWT
**Role:** admin

### Response 200
```json
{ "success": true }
```

### Lógica
Verificar que a transação pertence ao tenant antes de deletar.

---

## `GET /api/finance/repasses`
**Autenticação:** Bearer JWT
**Role:** admin

### Query params
- `periodo` — "YYYY-MM" (padrão: mês atual)

### Response 200
Lista de `RepasseProfissional` com profissional incluído.

---

## `POST /api/finance/repasses/calcular`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "periodo": "string — YYYY-MM"
}
```

### Response 200
```json
{
  "calculados": "number — repasses criados/atualizados",
  "repasses": [{ "profissionalId": "string", "totalRepasse": "number" }]
}
```

### Lógica
1. Buscar agendamentos do período por profissional
2. Calcular receita gerada por profissional (soma dos preços dos serviços)
3. Aplicar percentual ou valor fixo conforme `repasseTipo` do profissional
4. Fazer upsert em `RepasseProfissional` para cada profissional

---

## `PATCH /api/finance/repasses/[id]`
**Autenticação:** Bearer JWT
**Role:** admin

### Request
```json
{
  "status": "pago | cancelado",
  "observacao": "string?"
}
```

### Response 200
Repasse atualizado.

### Lógica
Se status=pago: setar `pago_em = now()`

---

## `GET /api/finance/recibo/[id]`
**Autenticação:** Bearer JWT
**Role:** admin | recepcao

### Response 200
```json
{
  "id": "string",
  "numeroRecibo": "string",
  "valor": "number",
  "descricao": "string",
  "formaPagamento": "string",
  "dataPagamento": "DateTime",
  "empresa": { "nome": "string", "cnpj": "string | null" },
  "paciente": { "nome": "string" }
}
```
