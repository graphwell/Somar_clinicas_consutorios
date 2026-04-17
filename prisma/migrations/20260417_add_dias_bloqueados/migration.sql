-- CreateTable
CREATE TABLE IF NOT EXISTS "dias_bloqueados" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Feriado',
    "mensagem" TEXT NOT NULL,
    "retornoData" TIMESTAMP(3),
    "retornoHora" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dias_bloqueados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dias_bloqueados_tenantId_data_ativo_idx" ON "dias_bloqueados"("tenantId", "data", "ativo");

-- AddForeignKey
ALTER TABLE "dias_bloqueados" ADD CONSTRAINT "dias_bloqueados_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "clinicas"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
