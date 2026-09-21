-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "resetCodigoHash" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "resetExpiraEm" TIMESTAMP(3);
ALTER TABLE "Usuario" ADD COLUMN "resetTentativas" INTEGER NOT NULL DEFAULT 0;
