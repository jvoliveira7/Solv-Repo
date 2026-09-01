-- CreateEnum
CREATE TYPE "StatusMensagem" AS ENUM ('ENVIADA', 'ENTREGUE', 'LIDA');

-- AlterTable
ALTER TABLE "Mensagem"
  ADD COLUMN "status" "StatusMensagem" NOT NULL DEFAULT 'ENVIADA',
  ADD COLUMN "respostaAId" TEXT;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_respostaAId_fkey"
  FOREIGN KEY ("respostaAId") REFERENCES "Mensagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
