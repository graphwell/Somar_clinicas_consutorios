# Diagnóstico — Synka × N8n Agent Tools

Data: 2026-04-11

## Endpoints existentes vs necessários pelo spec

| Ferramenta n8n        | URL no spec                               | Existe? | URL atual               | Gap                                       |
|-----------------------|-------------------------------------------|---------|-------------------------|-------------------------------------------|
| listar_servicos       | GET /api/n8n/services                     | ⚠️ Parcial | /api/n8n/servicos (slug) | URL diferente, aceita slug não tenantId   |
| listar_profissionais  | GET /api/n8n/professionals                | ⚠️ Parcial | /api/n8n/profissionais (slug) | Idem                                 |
| ver_horarios          | GET /api/n8n/availability                 | ⚠️ Parcial | /api/n8n/agenda/disponibilidade | URL diferente; OK aceita tenantId   |
| criar_agendamento     | POST /api/n8n/appointments                | ⚠️ Parcial | /api/n8n/agenda/criar   | URL diferente; OK aceita tenantId         |
| consultar_por_fone    | GET /api/n8n/appointments/by-phone        | ❌ FALTANDO | /api/n8n/cliente/buscar | Formato de resposta diferente             |
| cancelar              | DELETE /api/n8n/appointments/[id]         | ⚠️ Parcial | /api/n8n/agenda/cancelar | Método POST/PATCH, não DELETE por ID     |
| remarcar              | PATCH /api/n8n/appointments/[id]/reschedule | ❌ FALTANDO | — | Não existe                              |

## Auth
- **Existente**: `x-api-key: $N8N_API_KEY` em todas as rotas /api/n8n/*
- **Especificado**: `x-n8n-token: $N8N_INTERNAL_TOKEN` nas novas ferramentas do agente
- **Solução**: novas rotas aceitam ambos os headers; sem breaking change

## O que será criado
1. `src/lib/n8n-auth.ts` — adicionada `autenticarTokenInterno()` (suporta x-n8n-token)
2. `src/app/api/n8n/_middleware.ts` — re-export utilitário
3. `src/app/api/n8n/services/route.ts` — GET por tenantId
4. `src/app/api/n8n/professionals/route.ts` — GET por tenantId + serviceId opcional
5. `src/app/api/n8n/availability/route.ts` — GET slots de um profissional específico
6. `src/app/api/n8n/appointments/route.ts` — POST criar
7. `src/app/api/n8n/appointments/by-phone/route.ts` — GET agendamentos futuros por telefone
8. `src/app/api/n8n/appointments/[id]/route.ts` — DELETE cancelar por ID
9. `src/app/api/n8n/appointments/[id]/reschedule/route.ts` — PATCH remarcar

## O que NÃO será alterado
- Rotas /api/n8n/agenda/* e /api/n8n/servicos etc. → intactas (retrocompatibilidade)
- Nós do workflow: Webhook, Contexto, Memória, Disparar Resposta → não tocar
- Lógica de roteamento Wasender vs UltraMsg → não tocar
- N8N_API_KEY existente → continua funcionando

## Workflow N8n — situação
- Arquivo local: n8n/ai-agent-dynamic-flow.json
- A atualização via API do N8n (PATCH /api/v1/workflows) não é executada aqui
  porque exige acesso à instância em execução.
- Ação necessária: após deploy, aplicar o workflow JSON atualizado via painel N8n
  ou via: curl -X PATCH https://n8n.somar.ia.br/api/v1/workflows/ID \
           -H "X-N8N-API-KEY: ..." -d @n8n/ai-agent-dynamic-flow.json
