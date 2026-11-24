-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "especialidades" TEXT[] DEFAULT ARRAY[]::TEXT[];
