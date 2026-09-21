-- 1ª forma normal: o array Time.categorias vira uma tabela de junção.

-- CreateTable
CREATE TABLE "TimeCategoria" (
    "timeId" TEXT NOT NULL,
    "categoria" VARCHAR(12) NOT NULL,

    CONSTRAINT "TimeCategoria_pkey" PRIMARY KEY ("timeId", "categoria"),
    CONSTRAINT "chk_timecategoria_categoria"
      CHECK ("categoria" IN ('HARDWARE', 'SOFTWARE', 'REDE', 'ACESSO', 'IMPRESSORA', 'OUTRO'))
);

-- AddForeignKey
ALTER TABLE "TimeCategoria" ADD CONSTRAINT "TimeCategoria_timeId_fkey"
  FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra os dados existentes (uma linha por categoria de cada time)
INSERT INTO "TimeCategoria" ("timeId", "categoria")
SELECT DISTINCT "id", unnest("categorias") FROM "Time";

-- AlterTable
ALTER TABLE "Time" DROP COLUMN "categorias";
