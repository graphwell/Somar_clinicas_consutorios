-- Fase 4: metadata na TransacaoFinanceira para rastrear origem da cobrança
-- Nullable — zero impacto em transações existentes
ALTER TABLE "transacoes_financeiras"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
