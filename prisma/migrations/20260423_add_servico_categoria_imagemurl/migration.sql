-- AlterTable
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "categoria" TEXT;
ALTER TABLE "servicos" ADD COLUMN IF NOT EXISTS "imagemUrl" TEXT;
