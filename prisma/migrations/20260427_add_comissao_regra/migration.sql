-- Fase: Módulo de Comissionamento — Fase 1
-- Tabela de regras granulares de comissão por profissional
-- Todos os campos novos: nullable ou com default — zero impacto em dados existentes
-- percentualRepasse, repasseFixo, repasseTipo em Profissional: INTOCADOS

CREATE TABLE IF NOT EXISTS "comissao_regras" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "profissionalId" TEXT NOT NULL,
  "tipoBase"       TEXT NOT NULL,
  "referenciaId"   TEXT,
  "percentual"     DOUBLE PRECISION,
  "valorFixo"      DOUBLE PRECISION,
  "ativo"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "comissao_regras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comissao_regras_tenantId_idx"       ON "comissao_regras"("tenantId");
CREATE INDEX IF NOT EXISTS "comissao_regras_profissionalId_idx" ON "comissao_regras"("profissionalId");

ALTER TABLE "comissao_regras"
  ADD CONSTRAINT "comissao_regras_profissionalId_fkey"
  FOREIGN KEY ("profissionalId")
  REFERENCES "profissionais"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
