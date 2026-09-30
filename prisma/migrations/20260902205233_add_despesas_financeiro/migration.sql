-- CreateEnum
CREATE TYPE "StatusDespesa" AS ENUM ('pendente', 'paga');

-- CreateTable
CREATE TABLE "despesas_recorrentes" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_recorrentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "referencia" TEXT NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "status" "StatusDespesa" NOT NULL DEFAULT 'pendente',
    "dataPagamento" TIMESTAMP(3),
    "formaPagamento" TEXT,
    "comprovanteAnexo" TEXT,
    "comprovanteNomeArquivo" TEXT,
    "observacoes" TEXT,
    "despesaRecorrenteId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "alteradoPorId" TEXT,
    "alteradoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "despesas_status_referencia_idx" ON "despesas"("status", "referencia");

-- CreateIndex
CREATE INDEX "despesas_categoria_idx" ON "despesas"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "despesas_despesaRecorrenteId_referencia_key" ON "despesas"("despesaRecorrenteId", "referencia");

-- AddForeignKey
ALTER TABLE "despesas_recorrentes" ADD CONSTRAINT "despesas_recorrentes_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_despesaRecorrenteId_fkey" FOREIGN KEY ("despesaRecorrenteId") REFERENCES "despesas_recorrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_alteradoPorId_fkey" FOREIGN KEY ("alteradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
