-- Três conjuntos pequenos e estáveis voltam a ser ENUM nativo:
--  - Prioridade: a ordem do enum ordena a fila (BAIXA < MEDIA < ALTA < CRITICA)
--  - StatusMensagem e IniciadoPor: valores que praticamente nunca mudam.
-- Os CHECKs deles deixam de ser necessários (o tipo já restringe os valores).

CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE "StatusMensagem" AS ENUM ('ENVIADA', 'ENTREGUE', 'LIDA');
CREATE TYPE "IniciadoPor" AS ENUM ('USUARIO', 'TECNICO');

-- Chamado.prioridade
ALTER TABLE "Chamado" DROP CONSTRAINT "chk_chamado_prioridade";
ALTER TABLE "Chamado" ALTER COLUMN "prioridade" DROP DEFAULT;
ALTER TABLE "Chamado" ALTER COLUMN "prioridade" TYPE "Prioridade" USING "prioridade"::"Prioridade";
ALTER TABLE "Chamado" ALTER COLUMN "prioridade" SET DEFAULT 'MEDIA';

-- Mensagem.status
ALTER TABLE "Mensagem" DROP CONSTRAINT "chk_mensagem_status";
ALTER TABLE "Mensagem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Mensagem" ALTER COLUMN "status" TYPE "StatusMensagem" USING "status"::"StatusMensagem";
ALTER TABLE "Mensagem" ALTER COLUMN "status" SET DEFAULT 'ENVIADA';

-- ChatSessao.iniciadoPor
ALTER TABLE "ChatSessao" DROP CONSTRAINT "chk_chatsessao_iniciadopor";
ALTER TABLE "ChatSessao" ALTER COLUMN "iniciadoPor" DROP DEFAULT;
ALTER TABLE "ChatSessao" ALTER COLUMN "iniciadoPor" TYPE "IniciadoPor" USING "iniciadoPor"::"IniciadoPor";
ALTER TABLE "ChatSessao" ALTER COLUMN "iniciadoPor" SET DEFAULT 'USUARIO';
