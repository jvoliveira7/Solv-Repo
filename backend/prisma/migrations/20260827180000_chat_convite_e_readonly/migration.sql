-- CreateEnum
CREATE TYPE "IniciadoPor" AS ENUM ('USUARIO', 'TECNICO');

-- AlterTable
ALTER TABLE "ChatSessao"
  ADD COLUMN "iniciadoPor" "IniciadoPor" NOT NULL DEFAULT 'USUARIO',
  ADD COLUMN "encerradoPorResolucao" BOOLEAN NOT NULL DEFAULT false;
