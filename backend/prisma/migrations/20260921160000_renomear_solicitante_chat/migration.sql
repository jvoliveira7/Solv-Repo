-- ChatSessao.usuarioId era o solicitante do chamado; passa a ter o mesmo
-- nome do papel que ele tem em Chamado (solicitanteId). Renomear preserva os dados.
ALTER TABLE "ChatSessao" RENAME COLUMN "usuarioId" TO "solicitanteId";
ALTER TABLE "ChatSessao" RENAME CONSTRAINT "ChatSessao_usuarioId_fkey" TO "ChatSessao_solicitanteId_fkey";
