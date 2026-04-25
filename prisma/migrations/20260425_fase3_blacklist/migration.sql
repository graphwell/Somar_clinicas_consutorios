-- Fase 3: blacklist de no-show + horasBlacklist no plano
-- Todos os campos nullable ou com default — zero impacto em dados existentes

-- Paciente: blacklistedUntil = null (sem blacklist) para todos os existentes
ALTER TABLE "pacientes"
  ADD COLUMN IF NOT EXISTS "blacklistedUntil" TIMESTAMP(3);

-- PlanoAssinatura: horasBlacklist = 24h (padrão) para todos os existentes
ALTER TABLE "planos_assinatura"
  ADD COLUMN IF NOT EXISTS "horasBlacklist" INTEGER NOT NULL DEFAULT 24;
