# Módulo: financeiro

## O que faz
Fluxo de caixa completo com controle de receitas e despesas, repasses para
profissionais, geração de recibos numerados, KPIs mensais e evolução histórica
dos últimos 6 meses.

## Casos de uso
- Clínicas que precisam controlar receitas (atendimentos) e despesas (aluguel, insumos)
- Salões que fazem repasse percentual ou fixo para cada profissional
- Qualquer negócio que precise de dashboard financeiro com KPIs

## Dependências externas
Nenhuma obrigatória. Stripe é opcional para integração de pagamentos.

## Models do banco
- `TransacaoFinanceira`: registros de receita e despesa com múltiplos campos
- `RepasseProfissional`: consolidação mensal de repasse por profissional

## Campos da TransacaoFinanceira
- `tipo`: "income" (receita) ou "expense" (despesa)
- `status`: "pending" (a receber/pagar), "paid" (pago), "canceled"
- `formaPagamento`: pix | dinheiro | cartao_debito | cartao_credito | convenio | boleto
- `categoria`: categorização livre (aluguel, salario, insumos, consulta, etc.)
- `numeroRecibo`: gerado automaticamente no formato `REC-YYYYMM-NNN`
- `profissionalId`: opcional — para vincular a receita a um profissional

## KPIs calculados no resumo
- Receita bruta e variação em relação ao mês anterior
- Despesas totais (fixas e variáveis)
- Lucro líquido
- Ticket médio (receita / número de atendimentos)
- A receber e a pagar
- Repasses pendentes e pagos
- Receita por profissional
- Evolução dos últimos 6 meses
- Breakdown por forma de pagamento
- Breakdown por convênio

## API Routes
- `GET /api/finance/resumo` — KPIs e evolução histórica do mês
- `GET/POST /api/finance/transacoes` — listar e criar transações
- `PATCH/DELETE /api/finance/transacoes/[id]` — editar e deletar transação
- `GET /api/finance/repasses` — listar repasses do mês
- `POST /api/finance/repasses/calcular` — calcular repasses do mês
- `PATCH /api/finance/repasses/[id]` — marcar repasse como pago
- `GET /api/finance/recibo/[id]` — gerar recibo de uma transação

## Como adaptar para novo projeto
1. Copiar os models do `schema.prisma`
2. Ajustar as categorias de despesas conforme o negócio
3. Adaptar a lógica de repasse (percentual ou fixo por profissional)
4. Customizar o template de recibo

## O que NÃO está incluído (customizar)
- Exportação para Excel/PDF
- Conciliação bancária automática
- Nota fiscal eletrônica
- Integração direta com bancos
- Fluxo de caixa projetado
