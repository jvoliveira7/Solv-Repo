const prisma = require('../config/prisma');
const { notificarNovaMensagem } = require('../services/pushService');

// GET /api/chamados/:id/chat — busca sessão ativa ou pendente do chamado
async function buscarSessao(req, res) {
  const { id: chamadoId } = req.params;
  const { id: usuarioId, perfil } = req.usuario;

  try {
    const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const temAcesso =
      chamado.solicitanteId === usuarioId ||
      chamado.tecnicoId === usuarioId ||
      perfil === 'ADMIN';

    if (!temAcesso) return res.status(403).json({ erro: 'Acesso negado' });

    // Retorna a sessão mais recente independente do status — uma ENCERRADA
    // continua acessível como histórico read-only (não é ocultada nem apagada)
    const sessao = await prisma.chatSessao.findFirst({
      where: { chamadoId },
      orderBy: { criadoEm: 'desc' },
    });

    return res.json({ sessao: sessao || null });
  } catch (err) {
    console.error('Erro ao buscar sessão:', err);
    return res.status(500).json({ erro: 'Erro ao buscar sessão de chat' });
  }
}

// GET /api/chat/:sessaoId/mensagens
async function listarMensagens(req, res) {
  const { sessaoId } = req.params;
  const { id: usuarioId } = req.usuario;

  try {
    const sessao = await prisma.chatSessao.findUnique({
      where: { id: sessaoId },
    });

    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada' });

    const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
    if (!temAcesso) return res.status(403).json({ erro: 'Acesso negado' });

    const mensagens = await prisma.mensagem.findMany({
      where: { sessaoId },
      orderBy: { criadoEm: 'asc' },
      include: { autor: { select: { id: true, nome: true, avatar: true, perfil: true } } },
    });

    return res.json(mensagens);
  } catch (err) {
    console.error('Erro ao listar mensagens:', err);
    return res.status(500).json({ erro: 'Erro ao listar mensagens' });
  }
}

// GET /api/chats — lista todas as conversas do usuário logado, com última
// mensagem e contagem de não lidas, pra alimentar a aba "Chats" (estilo
// WhatsApp/Teams), separada da lista de chamados
async function listarChats(req, res) {
  const { id: usuarioId, perfil } = req.usuario;
  const souTecnico = perfil === 'TECNICO' || perfil === 'ADMIN';

  try {
    const sessoes = await prisma.chatSessao.findMany({
      where: souTecnico ? { tecnicoId: usuarioId } : { usuarioId },
      orderBy: { criadoEm: 'desc' },
      include: {
        chamado: { select: { id: true, titulo: true, status: true } },
        usuario: { select: { id: true, nome: true, avatar: true } },
        tecnico: { select: { id: true, nome: true, avatar: true } },
        mensagens: { orderBy: { criadoEm: 'desc' }, take: 1 },
      },
    });

    const chats = await Promise.all(
      sessoes.map(async (s) => {
        const naoLidas = await prisma.mensagem.count({
          where: { sessaoId: s.id, autorId: { not: usuarioId }, status: { not: 'LIDA' } },
        });

        return {
          sessaoId: s.id,
          chamadoId: s.chamado.id,
          chamadoTitulo: s.chamado.titulo,
          chamadoStatus: s.chamado.status,
          status: s.status,
          iniciadoPor: s.iniciadoPor,
          contato: souTecnico ? s.usuario : s.tecnico,
          ultimaMensagem: s.mensagens[0] || null,
          naoLidas,
        };
      })
    );

    return res.json(chats);
  } catch (err) {
    console.error('Erro ao listar chats:', err);
    return res.status(500).json({ erro: 'Erro ao listar chats' });
  }
}

// ── Ações disparadas pelos botões da notificação push ──────────────────
// Espelham os handlers de socket `recusar_chat` e `mensagem`, porque quando
// o usuário responde direto da notificação o app está fechado e não existe
// socket conectado pra emitir. Os eventos são reemitidos via io pra que a
// tela do outro lado atualize igual ao fluxo normal.
// TODO (pós-banca): extrair a lógica compartilhada com chatHandler.js.

// POST /api/chat/:sessaoId/recusar
async function recusarSessao(req, res) {
  const { sessaoId } = req.params;
  const { id: usuarioId } = req.usuario;

  try {
    const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });
    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada' });

    // Só quem recebeu a solicitação pode recusar
    const destinatarioId = sessao.iniciadoPor === 'USUARIO' ? sessao.tecnicoId : sessao.usuarioId;
    if (destinatarioId !== usuarioId) return res.status(403).json({ erro: 'Acesso negado' });

    if (sessao.status !== 'PENDENTE') {
      return res.status(400).json({ erro: 'Sessão não está pendente' });
    }

    await prisma.chatSessao.update({
      where: { id: sessaoId },
      data: { status: 'ENCERRADA' },
    });

    const iniciadorId = sessao.iniciadoPor === 'USUARIO' ? sessao.usuarioId : sessao.tecnicoId;
    req.app.get('io').to(`usuario:${iniciadorId}`).emit('chat_recusado', {
      sessaoId,
      chamadoId: sessao.chamadoId,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao recusar chat:', err);
    return res.status(500).json({ erro: 'Erro ao recusar chat' });
  }
}

// POST /api/chat/:sessaoId/mensagens — usado pela resposta rápida da notificação
async function enviarMensagem(req, res) {
  const { sessaoId } = req.params;
  const { texto } = req.body;
  const { id: usuarioId } = req.usuario;

  if (!texto?.trim()) return res.status(400).json({ erro: 'Texto é obrigatório' });

  try {
    const sessao = await prisma.chatSessao.findUnique({ where: { id: sessaoId } });
    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada' });

    if (sessao.status !== 'ATIVA') return res.status(400).json({ erro: 'Chat não está ativo' });

    const temAcesso = sessao.usuarioId === usuarioId || sessao.tecnicoId === usuarioId;
    if (!temAcesso) return res.status(403).json({ erro: 'Acesso negado' });

    const io = req.app.get('io');
    const sala = io.sockets.adapter.rooms.get(`chat:${sessaoId}`);
    const outroJaPresente = !!sala && [...sala].some((sid) => io.sockets.sockets.get(sid)?.usuario?.id !== usuarioId);

    const mensagem = await prisma.mensagem.create({
      data: {
        texto: texto.trim(),
        autorId: usuarioId,
        sessaoId,
        status: outroJaPresente ? 'ENTREGUE' : 'ENVIADA',
      },
      include: {
        autor: { select: { id: true, nome: true, avatar: true, perfil: true } },
        sessao: { select: { chamadoId: true } },
      },
    });

    io.to(`chat:${sessaoId}`).emit('nova_mensagem', { ...mensagem, chamadoId: mensagem.sessao.chamadoId });

    // Mesma lógica do handler de socket (chatHandler.js) — sem isso, quem
    // responde direto pela notificação (app fechado) nunca avisa o outro
    // lado se ele também não estiver com o app aberto.
    if (!outroJaPresente) {
      const destinatarioId = sessao.usuarioId === usuarioId ? sessao.tecnicoId : sessao.usuarioId;
      const chamado = await prisma.chamado.findUnique({
        where: { id: sessao.chamadoId },
        select: { titulo: true },
      });

      notificarNovaMensagem({
        destinatarioId,
        autor: mensagem.autor,
        texto: mensagem.texto,
        sessaoId,
        chamadoId: sessao.chamadoId,
        chamadoTitulo: chamado?.titulo,
        destinatarioEhTecnico: destinatarioId === sessao.tecnicoId,
      }).catch((err) => console.error('Erro no push de nova mensagem:', err));
    }

    return res.status(201).json(mensagem);
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    return res.status(500).json({ erro: 'Erro ao enviar mensagem' });
  }
}

module.exports = { buscarSessao, listarMensagens, listarChats, recusarSessao, enviarMensagem };
