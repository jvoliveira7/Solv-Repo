-- Cria o enum StatusChat
CREATE TYPE "StatusChat" AS ENUM ('PENDENTE', 'ATIVA', 'ENCERRADA');

-- Remove colunas antigas da ChatSessao
ALTER TABLE "ChatSessao" DROP COLUMN IF EXISTS "aprovadoUsuario";
ALTER TABLE "ChatSessao" DROP COLUMN IF EXISTS "aprovadoTecnico";
ALTER TABLE "ChatSessao" DROP COLUMN IF EXISTS "ativa";

-- Adiciona a nova coluna status
ALTER TABLE "ChatSessao" ADD COLUMN "status" "StatusChat" NOT NULL DEFAULT 'PENDENTE';

-- Adiciona IMPRESSORA ao enum Categoria
ALTER TYPE "Categoria" ADD VALUE IF NOT EXISTS 'IMPRESSORA';

-- Adiciona CRITICA ao enum Prioridade
ALTER TYPE "Prioridade" ADD VALUE IF NOT EXISTS 'CRITICA';