-- Fase 5: auth diferido no agendamento público

-- Paciente: campos opcionais para Google OAuth e email
ALTER TABLE "pacientes"
  ADD COLUMN IF NOT EXISTS "email"    TEXT,
  ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- Tabela de verificação OTP por telefone
CREATE TABLE IF NOT EXISTS "verificacoes_telefone" (
  "id"         TEXT NOT NULL,
  "telefone"   TEXT NOT NULL,
  "codigo"     TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "usado"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "verificacoes_telefone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "verificacoes_telefone_telefone_tenantId_idx"
  ON "verificacoes_telefone"("telefone", "tenantId");
