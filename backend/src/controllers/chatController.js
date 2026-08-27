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

    const sessao = await prisma.chatSessao.findFirst({
      where: {
        chamadoId,
        status: { in: ['PENDENTE', 'ATIVA'] },
      },
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

module.exports = { buscarSessao, listarMensagens };
