-- AlterTable: adiciona diasPermitidos ao PlanoAssinatura
-- Default vazio = sem restrição de dia (todos os dias permitidos)
-- Não quebra planos existentes (recebem array vazio por padrão)
ALTER TABLE "planos_assinatura" ADD COLUMN IF NOT EXISTS "diasPermitidos" TEXT[] NOT NULL DEFAULT '{}';
