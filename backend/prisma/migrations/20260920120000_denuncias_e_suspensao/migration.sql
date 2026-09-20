-- CreateEnum
CREATE TYPE "MotivoDenuncia" AS ENUM ('COMPORTAMENTO', 'RESPONSABILIDADE', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusDenuncia" AS ENUM ('PENDENTE', 'PROCEDENTE', 'IMPROCEDENTE');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "suspenso" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "motivoSuspensao" TEXT;

-- CreateTable
CREATE TABLE "Denuncia" (
    "id" TEXT NOT NULL,
    "motivo" "MotivoDenuncia" NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusDenuncia" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMP(3),
    "respostaAdmin" TEXT,
    "chamadoId" TEXT NOT NULL,
    "denuncianteId" TEXT NOT NULL,
    "denunciadoId" TEXT NOT NULL,

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Denuncia_chamadoId_denuncianteId_key" ON "Denuncia"("chamadoId", "denuncianteId");

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_chamadoId_fkey" FOREIGN KEY ("chamadoId") REFERENCES "Chamado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denuncianteId_fkey" FOREIGN KEY ("denuncianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denunciadoId_fkey" FOREIGN KEY ("denunciadoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
