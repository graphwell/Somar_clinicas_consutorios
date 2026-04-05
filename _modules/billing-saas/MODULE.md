# Módulo: billing-saas

## O que faz
Gerenciamento de assinaturas do produto SaaS: planos para as empresas clientes
(não os clientes finais das empresas). Controla trial, pagamentos via Stripe,
portal de gerenciamento, cancelamento e webhooks de eventos de cobrança.

Diferente do módulo `planos-assinaturas-clientes` (que controla clubes de fidelidade
dos clientes do negócio), este módulo controla quanto as EMPRESAS pagam pelo SaaS.

## Casos de uso
- Qualquer produto SaaS com modelo freemium + trial + assinatura paga
- Cobrança mensal via Stripe com diferentes planos e addons
- Portal de autoatendimento para o cliente gerenciar sua assinatura

## Dependências externas
- Stripe — obrigatório para cobranças

## Planos disponíveis (customizar)
- **Trial** (15 dias grátis): todas as funcionalidades
- **Solo** (R$79/mês): 1 profissional
- **Pro** (R$127/mês): até 5 profissionais
- **Business** (R$197/mês): até 10 profissionais

## Addons disponíveis (customizar)
- **WhatsApp extra** (R$49/mês): número adicional de WhatsApp
- **Automação com IA** (R$49/mês): respostas automáticas
- **Setup inicial** (R$97 único): configuração assistida

## Model do banco
- `Assinatura`: um registro por tenant com estado atual da assinatura

## Status da assinatura
- `trial` — dentro do período de trial (acesso completo)
- `active` — assinatura paga e vigente
- `past_due` — pagamento falhou (manter acesso por alguns dias)
- `canceling` — vai cancelar no fim do período
- `canceled` — cancelado
- `expired` — trial expirou sem assinar

## API Routes
- `GET /api/billing/planos` — listar planos disponíveis + assinatura atual
- `POST /api/billing/checkout` — criar sessão de checkout Stripe
- `POST /api/billing/portal` — abrir portal de gerenciamento Stripe
- `POST /api/billing/cancelar` — cancelar assinatura (ao fim do período)
- `POST /api/billing/webhook` — processar eventos Stripe (público)

## Como adaptar para novo projeto
1. Copiar o model do `schema.prisma`
2. Criar os planos no Stripe e configurar as variáveis de ambiente
3. Ajustar valores e nomes dos planos em `planos.ts`
4. Configurar o webhook no dashboard do Stripe apontando para `/api/billing/webhook`

## O que NÃO está incluído (customizar)
- Upgrade/downgrade de plano via portal (já incluso no Stripe Portal)
- Emissão de nota fiscal
- Período de carência pós-cancelamento
- Notificações automáticas de trial expirando
