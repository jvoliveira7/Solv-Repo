-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_autorId_fkey";

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_chamadoId_fkey";

-- DropTable
DROP TABLE "Comentario";
