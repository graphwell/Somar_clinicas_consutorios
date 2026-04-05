# Módulos Reutilizáveis — SaaS Multi-Tenant

Módulos de engenharia prontos para reutilizar em novos projetos SaaS.
Cada módulo contém schema Prisma, rotas de API e um prompt autocontido.

## Stack base
- Next.js 14+ (App Router)
- Prisma 5 + PostgreSQL
- TypeScript
- Tailwind CSS
- JWT (jose) para auth

## Como usar em novo projeto
1. Copiar o `schema.prisma` do módulo desejado para seu projeto
2. Rodar `npx prisma db push`
3. Colar o `prompt.md` no Claude Code
4. Ajustar cores, logo e textos

## Módulos disponíveis
| Módulo | Descrição | Dependências externas |
|--------|-----------|----------------------|
| auth-multitenant | Auth JWT, roles, convites, trial | jose, bcryptjs, Resend |
| whatsapp-marketing | Automações WhatsApp, lembretes, campanhas | WaSender API / UltraMsg |
| agenda-multiprofissional | Slots, schedules, folgas, buffer, upsell | — |
| financeiro | Fluxo de caixa, repasses, KPIs, recibos | Stripe (opcional) |
| planos-assinaturas-clientes | Clube de assinatura com contadores de uso | Stripe (opcional) |
| prontuario-ia | Prontuário clínico com IA, SOAP, CID-10 | Gemini API |
| billing-saas | Planos do produto SaaS, trial, cobrança | Stripe |
| n8n-integration | Webhooks e automações n8n, bot WhatsApp | n8n self-hosted |
| nicho-linguagem | Labels dinâmicos por tipo de negócio | — |

## Arquitetura multi-tenant
Todos os módulos seguem o mesmo padrão:
- `tenantId` é o identificador único da empresa/conta
- O middleware JWT injeta `x-tenant-id`, `x-user-id`, `x-user-role` nos headers
- Toda query ao banco inclui `where: { tenantId }` para isolar os dados
- Nunca consultar dados entre tenants sem verificação de `role === 'plataforma_admin'`
