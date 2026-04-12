-- Migração segura: converte status de String para enum StatusAgendamento
-- Preserva todos os dados existentes via USING cast

-- 1. Normalizar valores legados antes da conversão
UPDATE "agendamentos" SET status = 'done'     WHERE status IN ('concluido', 'CONCLUIDO', 'DONE');
UPDATE "agendamentos" SET status = 'cancelado' WHERE status IN ('CANCELADO');
UPDATE "agendamentos" SET status = 'confirmado' WHERE status IN ('CONFIRMADO');
UPDATE "agendamentos" SET status = 'pendente'  WHERE status NOT IN ('pendente','confirmado','em_atendimento','done','faltou','cancelado');

-- 2. Criar o tipo enum
CREATE TYPE "StatusAgendamento" AS ENUM ('pendente', 'confirmado', 'em_atendimento', 'done', 'faltou', 'cancelado');

-- 3. Remover default string antes de converter
ALTER TABLE "agendamentos" ALTER COLUMN "status" DROP DEFAULT;

-- 4. Converter a coluna preservando dados
ALTER TABLE "agendamentos"
  ALTER COLUMN "status" TYPE "StatusAgendamento"
  USING "status"::"StatusAgendamento";

-- 5. Redefinir default com o tipo correto
ALTER TABLE "agendamentos"
  ALTER COLUMN "status" SET DEFAULT 'pendente'::"StatusAgendamento";
