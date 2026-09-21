-- Boas normas de modelagem:
--  1. ENUMs nativos viram VARCHAR(n) + CHECK (chk_<tabela>_<coluna>)
--  2. Datas viram TIMESTAMPTZ (dados antigos eram UTC sem fuso)
--  3. Nota vira SMALLINT com CHECK de 1 a 5
--  4. Texto curto ganha limite de tamanho (VARCHAR); texto livre segue TEXT

-- ── 1. ENUM -> VARCHAR + CHECK ─────────────────────────────────────────
-- Defaults precisam sair antes da troca de tipo e voltam depois.

-- Usuario.perfil
ALTER TABLE "Usuario" ALTER COLUMN "perfil" DROP DEFAULT;
ALTER TABLE "Usuario" ALTER COLUMN "perfil" TYPE VARCHAR(10) USING "perfil"::text;
ALTER TABLE "Usuario" ALTER COLUMN "perfil" SET DEFAULT 'USUARIO';
ALTER TABLE "Usuario" ADD CONSTRAINT "chk_usuario_perfil"
  CHECK ("perfil" IN ('USUARIO', 'TECNICO', 'ADMIN'));

-- Chamado.categoria
ALTER TABLE "Chamado" ALTER COLUMN "categoria" TYPE VARCHAR(12) USING "categoria"::text;
ALTER TABLE "Chamado" ADD CONSTRAINT "chk_chamado_categoria"
  CHECK ("categoria" IN ('HARDWARE', 'SOFTWARE', 'REDE', 'ACESSO', 'IMPRESSORA', 'OUTRO'));

-- Chamado.prioridade
ALTER TABLE "Chamado" ALTER COLUMN "prioridade" DROP DEFAULT;
ALTER TABLE "Chamado" ALTER COLUMN "prioridade" TYPE VARCHAR(8) USING "prioridade"::text;
ALTER TABLE "Chamado" ALTER COLUMN "prioridade" SET DEFAULT 'MEDIA';
ALTER TABLE "Chamado" ADD CONSTRAINT "chk_chamado_prioridade"
  CHECK ("prioridade" IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA'));

-- Chamado.status
ALTER TABLE "Chamado" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Chamado" ALTER COLUMN "status" TYPE VARCHAR(16) USING "status"::text;
ALTER TABLE "Chamado" ALTER COLUMN "status" SET DEFAULT 'ABERTO';
ALTER TABLE "Chamado" ADD CONSTRAINT "chk_chamado_status"
  CHECK ("status" IN ('ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'RESOLVIDO', 'FECHADO'));

-- ChatSessao.status
ALTER TABLE "ChatSessao" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ChatSessao" ALTER COLUMN "status" TYPE VARCHAR(10) USING "status"::text;
ALTER TABLE "ChatSessao" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
ALTER TABLE "ChatSessao" ADD CONSTRAINT "chk_chatsessao_status"
  CHECK ("status" IN ('PENDENTE', 'ATIVA', 'ENCERRADA'));

-- ChatSessao.iniciadoPor
ALTER TABLE "ChatSessao" ALTER COLUMN "iniciadoPor" DROP DEFAULT;
ALTER TABLE "ChatSessao" ALTER COLUMN "iniciadoPor" TYPE VARCHAR(10) USING "iniciadoPor"::text;
ALTER TABLE "ChatSessao" ALTER COLUMN "iniciadoPor" SET DEFAULT 'USUARIO';
ALTER TABLE "ChatSessao" ADD CONSTRAINT "chk_chatsessao_iniciadopor"
  CHECK ("iniciadoPor" IN ('USUARIO', 'TECNICO'));

-- Mensagem.status
ALTER TABLE "Mensagem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Mensagem" ALTER COLUMN "status" TYPE VARCHAR(10) USING "status"::text;
ALTER TABLE "Mensagem" ALTER COLUMN "status" SET DEFAULT 'ENVIADA';
ALTER TABLE "Mensagem" ADD CONSTRAINT "chk_mensagem_status"
  CHECK ("status" IN ('ENVIADA', 'ENTREGUE', 'LIDA'));

-- Denuncia.motivo
ALTER TABLE "Denuncia" ALTER COLUMN "motivo" TYPE VARCHAR(20) USING "motivo"::text;
ALTER TABLE "Denuncia" ADD CONSTRAINT "chk_denuncia_motivo"
  CHECK ("motivo" IN ('COMPORTAMENTO', 'RESPONSABILIDADE', 'OUTRO'));

-- Denuncia.status
ALTER TABLE "Denuncia" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Denuncia" ALTER COLUMN "status" TYPE VARCHAR(14) USING "status"::text;
ALTER TABLE "Denuncia" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
ALTER TABLE "Denuncia" ADD CONSTRAINT "chk_denuncia_status"
  CHECK ("status" IN ('PENDENTE', 'PROCEDENTE', 'IMPROCEDENTE'));

-- Time.categorias: lista de texto por enquanto; a próxima migration troca
-- por tabela de junção (1ª forma normal).
ALTER TABLE "Time" ALTER COLUMN "categorias" TYPE TEXT[] USING "categorias"::text[];

-- Nenhuma coluna usa mais os tipos enumerados
DROP TYPE "Perfil";
DROP TYPE "Categoria";
DROP TYPE "Prioridade";
DROP TYPE "Status";
DROP TYPE "StatusChat";
DROP TYPE "IniciadoPor";
DROP TYPE "StatusMensagem";
DROP TYPE "MotivoDenuncia";
DROP TYPE "StatusDenuncia";

-- ── 2. Datas: TIMESTAMP -> TIMESTAMPTZ ─────────────────────────────────
-- Os valores gravados eram UTC sem fuso: AT TIME ZONE 'UTC' preserva o instante.
ALTER TABLE "Usuario" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Usuario" ALTER COLUMN "resetExpiraEm" TYPE TIMESTAMPTZ(3) USING "resetExpiraEm" AT TIME ZONE 'UTC';
ALTER TABLE "Time" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "MensagemTime" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Chamado" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Chamado" ALTER COLUMN "atualizadoEm" TYPE TIMESTAMPTZ(3) USING "atualizadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "ChatSessao" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Mensagem" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Avaliacao" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Denuncia" ALTER COLUMN "criadoEm" TYPE TIMESTAMPTZ(3) USING "criadoEm" AT TIME ZONE 'UTC';
ALTER TABLE "Denuncia" ALTER COLUMN "resolvidoEm" TYPE TIMESTAMPTZ(3) USING "resolvidoEm" AT TIME ZONE 'UTC';

-- ── 3. Nota: SMALLINT + CHECK ──────────────────────────────────────────
ALTER TABLE "Avaliacao" ALTER COLUMN "nota" TYPE SMALLINT;
ALTER TABLE "Avaliacao" ADD CONSTRAINT "chk_avaliacao_nota" CHECK ("nota" BETWEEN 1 AND 5);

-- ── 4. Limites de tamanho nos textos curtos ────────────────────────────
ALTER TABLE "Usuario" ALTER COLUMN "nome" TYPE VARCHAR(100);
ALTER TABLE "Usuario" ALTER COLUMN "email" TYPE VARCHAR(255);
ALTER TABLE "Usuario" ALTER COLUMN "senha" TYPE VARCHAR(60);
ALTER TABLE "Usuario" ALTER COLUMN "setor" TYPE VARCHAR(80);
ALTER TABLE "Usuario" ALTER COLUMN "pushToken" TYPE VARCHAR(255);
ALTER TABLE "Usuario" ALTER COLUMN "motivoSuspensao" TYPE VARCHAR(200);
ALTER TABLE "Usuario" ALTER COLUMN "resetCodigoHash" TYPE VARCHAR(60);
ALTER TABLE "Time" ALTER COLUMN "nome" TYPE VARCHAR(80);
ALTER TABLE "Chamado" ALTER COLUMN "titulo" TYPE VARCHAR(150);
ALTER TABLE "Chamado" ALTER COLUMN "localizacao" TYPE VARCHAR(150);
