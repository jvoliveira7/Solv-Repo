const prisma = require('../config/prisma');

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
      include: { autor: { select: { id: true, nome: true, perfil: true } } },
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
        usuario: { select: { id: true, nome: true } },
        tecnico: { select: { id: true, nome: true } },
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

module.exports = { buscarSessao, listarMensagens, listarChats };
