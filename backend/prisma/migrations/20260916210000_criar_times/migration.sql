-- CreateTable
CREATE TABLE "Time" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categorias" "Categoria"[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemTime" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "timeId" TEXT NOT NULL,

    CONSTRAINT "MensagemTime_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "timeId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "adminDoTime" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemTime" ADD CONSTRAINT "MensagemTime_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemTime" ADD CONSTRAINT "MensagemTime_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
