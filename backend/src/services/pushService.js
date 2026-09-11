const prisma = require('../config/prisma');

const URL_EXPO = 'https://exp.host/--/api/v2/push/send';
const TAMANHO_LOTE = 100;

// IDs das categorias (botões de ação) registradas no app — precisam bater
// com os de mobile/src/services/notificacaoService.js
const CATEGORIA = {
  SOLICITACAO_CHAT: 'chat_solicitacao',
  CHAMADO_URGENTE: 'chamado_urgente',
  NOVA_MENSAGEM: 'nova_mensagem',
};

// Canais do Android — criados no app, definem som/importância
const CANAL = { CHAT: 'chat', CHAMADOS: 'chamados' };

function lotes(lista, tamanho) {
  const saida = [];
  for (let i = 0; i < lista.length; i += tamanho) saida.push(lista.slice(i, i + tamanho));
  return saida;
}

function resumir(texto, limite = 120) {
  const limpo = (texto || '').trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

// Token que o Expo recusou de vez (app desinstalado, token trocado) não
// adianta guardar — zera pra não ficar tentando pra sempre.
async function descartarTokenInvalido(token) {
  try {
    await prisma.usuario.updateMany({ where: { pushToken: token }, data: { pushToken: null } });
  } catch (err) {
    console.error('Erro ao limpar pushToken inválido:', err);
  }
}

// Envia pra uma lista de tokens. Nunca lança: push é efeito colateral, não
// pode derrubar o fluxo que disparou (mandar mensagem, abrir chamado...).
async function enviarPush(tokens, { titulo, corpo, dados, categoria, canal }) {
  const validos = (tokens || []).filter(Boolean);
  if (validos.length === 0) return;

  for (const lote of lotes(validos, TAMANHO_LOTE)) {
    const mensagens = lote.map((token) => ({
      to: token,
      title: titulo,
      body: corpo,
      data: dados || {},
      sound: 'default',
      priority: 'high',
      channelId: canal,
      categoryId: categoria,
    }));

    try {
      const resposta = await fetch(URL_EXPO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(mensagens),
      });

      const json = await resposta.json();
      const recibos = json?.data || [];

      // A resposta vem na mesma ordem do envio, então o índice mapeia o token
      recibos.forEach((recibo, i) => {
        if (recibo?.status !== 'error') return;
        console.error('Push recusado pelo Expo:', recibo.message);
        if (recibo.details?.error === 'DeviceNotRegistered') descartarTokenInvalido(lote[i]);
      });
    } catch (err) {
      console.error('Erro ao enviar push:', err);
    }
  }
}

async function tokensDe(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { pushToken: true },
  });
  return usuario?.pushToken ? [usuario.pushToken] : [];
}

// ── Notificações por tipo ─────────────────────────────────────────────

// RN15: usuário solicitou chat, técnico precisa aceitar ou recusar
async function notificarSolicitacaoChat({ tecnicoId, sessaoId, chamadoId, chamadoTitulo, solicitante }) {
  await enviarPush(await tokensDe(tecnicoId), {
    titulo: `${solicitante.nome} quer conversar`,
    corpo: resumir(chamadoTitulo),
    categoria: CATEGORIA.SOLICITACAO_CHAT,
    canal: CANAL.CHAT,
    dados: {
      tipo: 'SOLICITACAO_CHAT',
      sessaoId,
      chamadoId,
      chamadoTitulo,
      contato: solicitante,
      isTecnico: true,
    },
  });
}

// Chamado novo de prioridade alta/crítica ainda sem técnico designado
async function notificarChamadoUrgente({ chamado }) {
  const tecnicos = await prisma.usuario.findMany({
    where: { perfil: { in: ['TECNICO', 'ADMIN'] }, pushToken: { not: null } },
    select: { pushToken: true },
  });

  await enviarPush(tecnicos.map((t) => t.pushToken), {
    titulo: `Chamado ${chamado.prioridade} sem técnico`,
    corpo: resumir(chamado.titulo),
    categoria: CATEGORIA.CHAMADO_URGENTE,
    canal: CANAL.CHAMADOS,
    dados: { tipo: 'CHAMADO_URGENTE', chamadoId: chamado.id },
  });
}

// Mensagem nova pra quem não está com a conversa aberta
async function notificarNovaMensagem({ destinatarioId, autor, texto, sessaoId, chamadoId, chamadoTitulo, destinatarioEhTecnico }) {
  await enviarPush(await tokensDe(destinatarioId), {
    titulo: autor.nome,
    corpo: resumir(texto),
    categoria: CATEGORIA.NOVA_MENSAGEM,
    canal: CANAL.CHAT,
    dados: {
      tipo: 'NOVA_MENSAGEM',
      sessaoId,
      chamadoId,
      chamadoTitulo,
      contato: autor,
      isTecnico: destinatarioEhTecnico,
    },
  });
}

module.exports = {
  enviarPush,
  notificarSolicitacaoChat,
  notificarChamadoUrgente,
  notificarNovaMensagem,
  CATEGORIA,
  CANAL,
};
