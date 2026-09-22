-- Chaves estrangeiras nao ganham indice automatico no PostgreSQL (so a PK
-- referenciada do outro lado ganha). Estas 9 colunas sao filtradas em WHERE
-- ou groupBy no codigo (fila por solicitante/tecnico, historico de chat,
-- ranking de denuncias por tecnico, membros de time) e nao tinham indice
-- proprio. Adicionar um indice e sempre seguro: nao muda nenhum resultado
-- de consulta, so acelera a busca conforme a tabela cresce.
CREATE INDEX "Usuario_timeId_idx" ON "Usuario"("timeId");

CREATE INDEX "MensagemTime_timeId_idx" ON "MensagemTime"("timeId");

CREATE INDEX "Chamado_solicitanteId_idx" ON "Chamado"("solicitanteId");
CREATE INDEX "Chamado_tecnicoId_idx" ON "Chamado"("tecnicoId");

CREATE INDEX "Denuncia_denunciadoId_idx" ON "Denuncia"("denunciadoId");

CREATE INDEX "ChatSessao_solicitanteId_idx" ON "ChatSessao"("solicitanteId");
CREATE INDEX "ChatSessao_tecnicoId_idx" ON "ChatSessao"("tecnicoId");

CREATE INDEX "Mensagem_sessaoId_idx" ON "Mensagem"("sessaoId");
CREATE INDEX "Mensagem_autorId_idx" ON "Mensagem"("autorId");
