# Módulo: planos-assinaturas-clientes

## O que faz
Clube de assinaturas para clientes finais: a empresa cria planos (ex: "Corte + Barba
Ilimitado por R$149/mês") e os clientes assinam. O sistema controla contadores de
uso por serviço, permite desconto em serviços extras e marcação de agendamento
prioritário para assinantes.

Diferente do módulo `billing-saas` (que controla a assinatura da empresa no produto),
este módulo controla assinaturas de clientes dentro do negócio (clube de fidelidade).

## Casos de uso
- Salão de beleza com clube de assinantes (X cortes por mês)
- Clínica estética com mensalidade de procedimentos
- Academia com pacotes de sessões
- Qualquer negócio com modelo de recorrência para clientes

## Dependências externas
- Stripe (opcional) — para cobrar os clientes automaticamente

## Models do banco
- `PlanoAssinatura`: definição do plano criado pela empresa
- `AssinaturaCliente`: assinatura de um cliente específico com contadores de uso

## Campos importantes do PlanoAssinatura
- `servicos`: JSON com lista de serviços incluídos, ex: `[{ servicoId: "xxx", quantidade: 2, tipo: "ilimitado" }]`
- `agendamentoPrioritario`: se true, assinante tem prioridade na agenda
- `descontoProdutos`: % de desconto em produtos
- `descontoServicosExtras`: % de desconto em serviços não incluídos no plano
- `stripePriceId`: ID do price no Stripe (criado automaticamente ao criar o plano)

## Campos importantes do AssinaturaCliente
- `contadorUso`: JSON com uso atual por serviço, ex: `{ "servicoId": { "usado": 1, "limite": 2 } }`
- `periodoFim`: calculado conforme periodicidade (mensal, trimestral, anual)
- `proximaCobranca`: data da próxima cobrança

## Templates de plano
O sistema inclui 3 templates prontos para ativar com 1 clique:
- **Essencial** (R$89,90): 2x por serviço/mês, 5% OFF extras
- **Premium** (R$149,90): 4x/mês, agendamento prioritário, 10% OFF extras e produtos
- **VIP** (R$249,90): ilimitado, agendamento exclusivo, 20% OFF produtos, 15% OFF extras

## API Routes
- `GET/POST /api/subscriptions/planos` — listar e criar planos
- `GET/PATCH/DELETE /api/subscriptions/planos/[id]` — gerenciar plano
- `POST /api/subscriptions/planos/ativar-template` — ativar template com 1 clique
- `GET/POST /api/subscriptions/clientes` — listar e criar assinaturas de clientes
- `PATCH /api/subscriptions/clientes/[id]/uso` — registrar uso de um serviço
- `GET /api/subscriptions/verificar` — verificar se cliente tem plano ativo para serviço
- `POST /api/subscriptions/webhook` — processar pagamentos Stripe recorrentes

## Como adaptar para novo projeto
1. Copiar os models do `schema.prisma`
2. Definir quais serviços e quantidades cabem em cada plano
3. Configurar Stripe se quiser cobrança automática
4. Integrar com o módulo de agendamento para verificar contadores antes de cobrar

## O que NÃO está incluído (customizar)
- Página de planos pública (para clientes escolherem)
- Notificação automática de renovação
- Portabilidade de uso entre meses (créditos que não expiram)
- Planos com limite de período (ex: "6 meses de tratamento")
