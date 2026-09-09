const prisma = require('../config/prisma');

// POST /api/chamados
async function criar(req, res) {
  const { titulo, descricao, categoria, prioridade, localizacao } = req.body;

  if (!titulo || !descricao || !categoria) {
    return res.status(400).json({ erro: 'Título, descrição e categoria são obrigatórios' });
  }

  try {
    const chamado = await prisma.chamado.create({
      data: {
        titulo,
        descricao,
        categoria,
        prioridade: prioridade || 'MEDIA',
        localizacao: localizacao || null,
        solicitanteId: req.usuario.id,
      },
      include: {
        solicitante: { select: { id: true, nome: true, avatar: true, setor: true } },
      },
    });

    return res.status(201).json(chamado);
  } catch (err) {
    console.error('Erro ao criar chamado:', err);
    return res.status(500).json({ erro: 'Erro ao criar chamado' });
  }
}

// GET /api/chamados/contagem
// Contagem de chamados agrupada nos mesmos 3 grupos usados nas abas do
// painel do técnico (Abertos / Em andamento / Resolvidos), pros badges.
async function contarPorGrupo(req, res) {
  const { perfil, id } = req.usuario;
  const where = perfil === 'USUARIO' ? { solicitanteId: id } : {};

  try {
    const [abertos, emAndamento, resolvidos] = await Promise.all([
      prisma.chamado.count({ where: { ...where, status: 'ABERTO' } }),
      prisma.chamado.count({ where: { ...where, status: { in: ['EM_ATENDIMENTO', 'AGUARDANDO'] } } }),
      prisma.chamado.count({ where: { ...where, status: { in: ['RESOLVIDO', 'FECHADO'] } } }),
    ]);

    return res.json({ ABERTO: abertos, EM_ATENDIMENTO: emAndamento, RESOLVIDO: resolvidos });
  } catch (err) {
    console.error('Erro ao contar chamados:', err);
    return res.status(500).json({ erro: 'Erro ao contar chamados' });
  }
}

// GET /api/chamados
// Usuário vê só os próprios. Técnico/Admin vê todos. Aceita ?status=ABERTO&categoria=HARDWARE
async function listar(req, res) {
  const { status, categoria, prioridade } = req.query;
  const { id, perfil } = req.usuario;

  const where = {};

  if (perfil === 'USUARIO') {
    where.solicitanteId = id;
  }

  if (status) where.status = status.includes(',') ? { in: status.split(',') } : status;
  if (categoria) where.categoria = categoria;
  if (prioridade) where.prioridade = prioridade;

  try {
    const chamados = await prisma.chamado.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: {
        solicitante: { select: { id: true, nome: true, avatar: true, setor: true } },
        tecnico: { select: { id: true, nome: true, avatar: true } },
        chat: { select: { status: true } },
        _count: { select: { comentarios: true } },
      },
    });

    return res.json(chamados);
  } catch (err) {
    console.error('Erro ao listar chamados:', err);
    return res.status(500).json({ erro: 'Erro ao listar chamados' });
  }
}

// GET /api/chamados/:id
async function buscarPorId(req, res) {
  const { id } = req.params;
  const { id: usuarioId, perfil } = req.usuario;

  try {
    const chamado = await prisma.chamado.findUnique({
      where: { id },
      include: {
        solicitante: { select: { id: true, nome: true, avatar: true, setor: true } },
        tecnico: { select: { id: true, nome: true, avatar: true } },
        comentarios: {
          orderBy: { criadoEm: 'asc' },
          include: { autor: { select: { id: true, nome: true, avatar: true, perfil: true } } },
        },
        avaliacao: true,
      },
    });

    if (!chamado) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }

    // Usuário só acessa o próprio chamado
    if (perfil === 'USUARIO' && chamado.solicitanteId !== usuarioId) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    return res.json(chamado);
  } catch (err) {
    console.error('Erro ao buscar chamado:', err);
    return res.status(500).json({ erro: 'Erro ao buscar chamado' });
  }
}

// PATCH /api/chamados/:id/status  (técnico/admin)
async function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status, anotacao } = req.body;

  const statusValidos = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'RESOLVIDO', 'FECHADO'];
  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${statusValidos.join(', ')}` });
  }

  try {
    const chamado = await prisma.chamado.findUnique({ where: { id } });
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const dados = { status };

    // Ao assumir, vincula o técnico automaticamente
    if (status === 'EM_ATENDIMENTO' && !chamado.tecnicoId) {
      dados.tecnicoId = req.usuario.id;
    }

    const atualizado = await prisma.chamado.update({
      where: { id },
      data: dados,
      include: {
        solicitante: { select: { id: true, nome: true, avatar: true } },
        tecnico: { select: { id: true, nome: true, avatar: true } },
      },
    });

    // Registra anotação interna como comentário, se fornecida
    if (anotacao) {
      await prisma.comentario.create({
        data: {
          texto: anotacao,
          autorId: req.usuario.id,
          chamadoId: id,
        },
      });
    }

    // Ao resolver/fechar, o chat (se ativo) vira histórico read-only — nunca é apagado
    if (status === 'RESOLVIDO' || status === 'FECHADO') {
      const sessaoAtiva = await prisma.chatSessao.findFirst({
        where: { chamadoId: id, status: 'ATIVA' },
      });

      if (sessaoAtiva) {
        await prisma.chatSessao.update({
          where: { id: sessaoAtiva.id },
          data: { status: 'ENCERRADA', encerradoPorResolucao: true },
        });

        const io = req.app.get('io');
        io.to(`chat:${sessaoAtiva.id}`).emit('chat_encerrado', {
          sessaoId: sessaoAtiva.id,
          chamadoId: id,
          encerradoPorResolucao: true,
        });
      }
    }

    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
}

// POST /api/chamados/:id/comentarios
async function adicionarComentario(req, res) {
  const { id } = req.params;
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: 'Texto do comentário é obrigatório' });
  }

  try {
    const chamado = await prisma.chamado.findUnique({ where: { id } });
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    // Usuário só comenta no próprio chamado
    if (req.usuario.perfil === 'USUARIO' && chamado.solicitanteId !== req.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const comentario = await prisma.comentario.create({
      data: {
        texto,
        autorId: req.usuario.id,
        chamadoId: id,
      },
      include: {
        autor: { select: { id: true, nome: true, avatar: true, perfil: true } },
      },
    });

    return res.status(201).json(comentario);
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err);
    return res.status(500).json({ erro: 'Erro ao adicionar comentário' });
  }
}

// GET /api/chamados/estatisticas-tecnico
// Números pro card de estatísticas na tela de Perfil do técnico logado.
async function estatisticasTecnico(req, res) {
  const { id } = req.usuario;

  try {
    const [resolvidos, agregadoAvaliacoes] = await Promise.all([
      prisma.chamado.count({ where: { tecnicoId: id, status: { in: ['RESOLVIDO', 'FECHADO'] } } }),
      prisma.avaliacao.aggregate({
        where: { chamado: { tecnicoId: id } },
        _avg: { nota: true },
        _count: { nota: true },
      }),
    ]);

    return res.json({
      resolvidos,
      mediaAvaliacoes: agregadoAvaliacoes._avg.nota,
      totalAvaliacoes: agregadoAvaliacoes._count.nota,
    });
  } catch (err) {
    console.error('Erro ao calcular estatísticas:', err);
    return res.status(500).json({ erro: 'Erro ao calcular estatísticas' });
  }
}

// POST /api/chamados/:id/avaliacao  (usuário solicitante, chamado já resolvido/fechado)
async function avaliar(req, res) {
  const { id } = req.params;
  const { nota, comentario } = req.body;

  const notaNum = Number(nota);
  if (!Number.isInteger(notaNum) || notaNum < 1 || notaNum > 5) {
    return res.status(400).json({ erro: 'Nota deve ser um número inteiro de 1 a 5' });
  }

  try {
    const chamado = await prisma.chamado.findUnique({ where: { id } });
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    if (chamado.solicitanteId !== req.usuario.id) {
      return res.status(403).json({ erro: 'Apenas quem abriu o chamado pode avaliar' });
    }

    if (!['RESOLVIDO', 'FECHADO'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'O chamado precisa estar resolvido para ser avaliado' });
    }

    if (!chamado.tecnicoId) {
      return res.status(400).json({ erro: 'Chamado sem técnico atribuído' });
    }

    const avaliacaoExistente = await prisma.avaliacao.findUnique({ where: { chamadoId: id } });
    if (avaliacaoExistente) {
      return res.status(409).json({ erro: 'Este chamado já foi avaliado' });
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        nota: notaNum,
        comentario: comentario?.trim() || null,
        chamadoId: id,
        autorId: req.usuario.id,
      },
    });

    return res.status(201).json(avaliacao);
  } catch (err) {
    // corrida: duas requisições tentando criar ao mesmo tempo — a constraint unique no chamadoId protege
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Este chamado já foi avaliado' });
    }
    console.error('Erro ao avaliar chamado:', err);
    return res.status(500).json({ erro: 'Erro ao avaliar chamado' });
  }
}

module.exports = { criar, listar, contarPorGrupo, estatisticasTecnico, buscarPorId, atualizarStatus, adicionarComentario, avaliar };
