# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Sempre responda em português brasileiro. Nunca use inglês nas respostas.

@AGENTS.md

## Commands

```bash
npm run dev          # Start development server
npm run build        # prisma generate + next build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply a migration
npx prisma studio    # GUI to inspect/edit the database
```

No test runner is configured — there are no automated tests in this project.

## Architecture Overview

**Synka** is a multi-tenant SaaS platform for clinics, salons, and service businesses (each called a *Clinica* / tenant). Built with Next.js 16 App Router, PostgreSQL via Prisma 5, Tailwind CSS 4, and TypeScript.

### Multi-Tenancy

Every authenticated API request passes through `src/middleware.ts`, which:
1. Validates the JWT (`Authorization: Bearer <token>`)
2. Extracts `tenantId`, `userId`, and `role` from the payload
3. Injects them as request headers: `x-tenant-id`, `x-user-id`, `x-user-role`

API route handlers must read `x-tenant-id` from headers to scope all DB queries to the correct tenant. Never query across tenants without an explicit admin check (`role === 'synka_admin'`).

Bot routes (`/api/bot/*`) bypass token validation — they use their own API key auth.

### Key Domain Models (Prisma)

- **Clinica** — the tenant; owns everything else
- **Profissional** — practitioners with schedules (`ProfessionalSchedule`) and services
- **Agendamento** — appointments; status flow: `PENDENTE → CONFIRMADO → CONCLUIDO / CANCELADO`
- **Paciente** — patients, linked to a clinic
- **Servico** — services with duration, price, and assigned professionals (M:N)
- **TransacaoFinanceira** — income/expense records
- **NichoConfig** — per-clinic terminology (customer label, professional label, etc.) driven by `NichoType` enum
- **ClinicIntegration** — third-party integrations (Stripe, WhatsApp, n8n)

### Niche System

The platform serves multiple business verticals (`NichoType`: `CLINICA_MEDICA`, `SALAO_BELEZA`, `BARBEARIA`, etc.). UI labels (e.g., "paciente" vs "cliente", "médico" vs "profissional") are driven by `NichoConfig` for each clinic. Check `src/lib/nomenclatures.ts` for helpers.

### API Layer (`src/app/api/`)

All routes are Next.js route handlers. Main areas:
- `/auth/` — login/register, JWT issuance
- `/appointments/` — CRUD + status transitions
- `/patients/`, `/team/`, `/services/` — standard resource CRUD
- `/dashboard/kpi/` — aggregated metrics
- `/billing/` — Stripe checkout + webhook
- `/bot/` — AI chatbot endpoints (Gemini); used by n8n workflows
- `/n8n/` — webhook endpoints called by n8n automations
- `/admin/` — platform-level ops, restricted to `synka_admin`

### AI Integration

Provider is configured via `AI_PROVIDER` env var. Currently uses Google Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`). See `src/lib/` for AI utilities. The bot context endpoint at `/api/bot/context` feeds clinic data into the Gemini prompt.

### n8n Workflows (`n8n/`)

Workflow JSON files for n8n automations (appointment reminders, WhatsApp messages, AI agent flows). The `N8N_API_KEY` env var authenticates n8n-to-app webhooks.

### Auth

JWT-based. `src/lib/auth.ts` issues tokens; `src/lib/auth-helpers.ts` provides server-side helpers. Tokens carry `{ tenantId, userId, role }`. Role values: `admin`, `recepcao`, `synka_admin`.

### Environment Variables

Required: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `RESEND_API_KEY`, `N8N_API_KEY`, `GEMINI_API_KEY`, `AI_PROVIDER`, `GEMINI_MODEL`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT`
