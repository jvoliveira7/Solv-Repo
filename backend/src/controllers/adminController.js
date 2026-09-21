const prisma = require('../config/prisma');

const PERFIS = ['USUARIO', 'TECNICO', 'ADMIN'];
const STATUS_RESOLVIDO = ['RESOLVIDO', 'FECHADO'];

const SELECT_USUARIO_LISTA = {
  id: true,
  nome: true,
  email: true,
  setor: true,
  avatar: true,
  perfil: true,
  suspenso: true,
  motivoSuspensao: true,
  criadoEm: true,
  adminDoTime: true,
  time: { select: { id: true, nome: true } },
  _count: {
    select: {
      denunciasRecebidas: { where: { status: 'PROCEDENTE' } },
    },
  },
};

function contagemPorChave(grupos, chave) {
  return grupos.reduce((acc, g) => ({ ...acc, [g[chave]]: g._count._all }), {});
}

// GET /api/admin/visao-geral
async function visaoGeral(req, res) {
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalChamados,
      porStatus,
      porCategoria,
      porPrioridade,
      semTecnico,
      resolvidos,
      avaliacoes,
      porPerfil,
      suspensos,
      denunciasPendentes,
      criadosUltimos7,
      resolvidosUltimos7,
      tecnicos,
      resolvidosPorTecnico,
      notasPorTecnico,
    ] = await Promise.all([
      prisma.chamado.count(),
      prisma.chamado.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.chamado.groupBy({ by: ['categoria'], _count: { _all: true } }),
      prisma.chamado.groupBy({ by: ['prioridade'], _count: { _all: true } }),
      prisma.chamado.count({ where: { status: 'ABERTO', tecnicoId: null } }),
      prisma.chamado.findMany({
        where: { status: { in: STATUS_RESOLVIDO } },
        select: { criadoEm: true, atualizadoEm: true },
      }),
      prisma.avaliacao.aggregate({ _avg: { nota: true }, _count: { nota: true } }),
      prisma.usuario.groupBy({ by: ['perfil'], _count: { _all: true } }),
      prisma.usuario.count({ where: { suspenso: true } }),
      prisma.denuncia.count({ where: { status: 'PENDENTE' } }),
      prisma.chamado.count({ where: { criadoEm: { gte: seteDiasAtras } } }),
      prisma.chamado.count({
        where: { status: { in: STATUS_RESOLVIDO }, atualizadoEm: { gte: seteDiasAtras } },
      }),
      prisma.usuario.findMany({
        where: { perfil: { in: ['TECNICO', 'ADMIN'] } },
        select: { id: true, nome: true, avatar: true, suspenso: true, time: { select: { nome: true } } },
      }),
      prisma.chamado.groupBy({
        by: ['tecnicoId'],
        where: { tecnicoId: { not: null }, status: { in: STATUS_RESOLVIDO } },
        _count: { _all: true },
      }),
      prisma.avaliacao.findMany({
        select: { nota: true, chamado: { select: { tecnicoId: true } } },
      }),
    ]);

    // Tempo até resolver = criação → última atualização do chamado resolvido
    // (o schema não guarda a data exata de resolução; é uma aproximação).
    const tempoMedioHoras = resolvidos.length
      ? resolvidos.reduce((soma, c) => soma + (c.atualizadoEm - c.criadoEm), 0)
        / resolvidos.length / 3_600_000
      : null;

    const resolvidosMap = resolvidosPorTecnico.reduce(
      (acc, g) => ({ ...acc, [g.tecnicoId]: g._count._all }), {}
    );
    const notasMap = {};
    for (const a of notasPorTecnico) {
      const tid = a.chamado.tecnicoId;
      if (!tid) continue;
      (notasMap[tid] ||= []).push(a.nota);
    }

    const ranking = tecnicos
      .map((t) => {
        const notas = notasMap[t.id] || [];
        return {
          id: t.id,
          nome: t.nome,
          avatar: t.avatar,
          suspenso: t.suspenso,
          time: t.time?.nome || null,
          resolvidos: resolvidosMap[t.id] || 0,
          totalAvaliacoes: notas.length,
          mediaAvaliacoes: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
        };
      })
      .sort((a, b) => b.resolvidos - a.resolvidos || (b.mediaAvaliacoes || 0) - (a.mediaAvaliacoes || 0))
      .slice(0, 5);

    return res.json({
      chamados: {
        total: totalChamados,
        semTecnico,
        porStatus: contagemPorChave(porStatus, 'status'),
        porCategoria: contagemPorChave(porCategoria, 'categoria'),
        porPrioridade: contagemPorChave(porPrioridade, 'prioridade'),
        criadosUltimos7Dias: criadosUltimos7,
        resolvidosUltimos7Dias: resolvidosUltimos7,
        tempoMedioResolucaoHoras: tempoMedioHoras,
      },
      avaliacoes: { media: avaliacoes._avg.nota, total: avaliacoes._count.nota },
      usuarios: { porPerfil: contagemPorChave(porPerfil, 'perfil'), suspensos },
      denunciasPendentes,
      ranking,
    });
  } catch (err) {
    console.error('Erro na visão geral do admin:', err);
    return res.status(500).json({ erro: 'Erro ao montar a visão geral' });
  }
}

// GET /api/admin/usuarios?busca=&perfil=
async function listarUsuarios(req, res) {
  const { busca, perfil } = req.query;

  const where = {};
  if (perfil && PERFIS.includes(perfil)) where.perfil = perfil;
  if (busca?.trim()) {
    where.OR = [
      { nome: { contains: busca.trim(), mode: 'insensitive' } },
      { email: { contains: busca.trim(), mode: 'insensitive' } },
    ];
  }

  try {
    const usuarios = await prisma.usuario.findMany({
      where,
      select: SELECT_USUARIO_LISTA,
      orderBy: { nome: 'asc' },
      take: 200,
    });
    return res.json(usuarios);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
}

// PATCH /api/admin/usuarios/:id/perfil  { perfil }
async function alterarPerfil(req, res) {
  const { id } = req.params;
  const { perfil } = req.body;

  if (!PERFIS.includes(perfil)) return res.status(400).json({ erro: 'Perfil inválido' });
  if (id === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode alterar o seu próprio perfil' });
  }

  try {
    const alvo = await prisma.usuario.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado' });

    // Quem deixa de ser técnico/admin sai do time (time é coisa da equipe técnica)
    const dados = { perfil };
    if (perfil === 'USUARIO') {
      dados.timeId = null;
      dados.adminDoTime = false;
    }

    const atualizado = await prisma.usuario.update({
      where: { id },
      data: dados,
      select: SELECT_USUARIO_LISTA,
    });
    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao alterar perfil:', err);
    return res.status(500).json({ erro: 'Erro ao alterar perfil' });
  }
}

// Suspende/reativa uma conta. Ao suspender um técnico, devolve os chamados
// dele pra fila, encerra os chats abertos e derruba os sockets conectados.
async function aplicarSuspensao(io, usuarioId, suspenso, motivo) {
  const atualizado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.update({
      where: { id: usuarioId },
      data: { suspenso, motivoSuspensao: suspenso ? motivo || null : null },
      select: SELECT_USUARIO_LISTA,
    });

    if (suspenso) {
      await tx.chatSessao.updateMany({
        where: { tecnicoId: usuarioId, status: { in: ['PENDENTE', 'ATIVA'] } },
        data: { status: 'ENCERRADA' },
      });
      await tx.chamado.updateMany({
        where: { tecnicoId: usuarioId, status: { in: ['EM_ATENDIMENTO', 'AGUARDANDO'] } },
        data: { tecnicoId: null, status: 'ABERTO' },
      });
      await tx.usuario.update({ where: { id: usuarioId }, data: { pushToken: null } });
    }

    return usuario;
  });

  if (suspenso && io) io.in(`usuario:${usuarioId}`).disconnectSockets(true);

  return atualizado;
}

// PATCH /api/admin/usuarios/:id/suspensao  { suspenso, motivo }
async function alterarSuspensao(req, res) {
  const { id } = req.params;
  const { suspenso, motivo } = req.body;

  if (typeof suspenso !== 'boolean') {
    return res.status(400).json({ erro: 'suspenso deve ser true ou false' });
  }
  if (id === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode suspender a si mesmo' });
  }

  try {
    const alvo = await prisma.usuario.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const atualizado = await aplicarSuspensao(req.app.get('io'), id, suspenso, motivo?.trim().slice(0, 200));
    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao alterar suspensão:', err);
    return res.status(500).json({ erro: 'Erro ao alterar suspensão' });
  }
}

// GET /api/admin/denuncias?status=
async function listarDenuncias(req, res) {
  const { status } = req.query;
  const where = ['PENDENTE', 'PROCEDENTE', 'IMPROCEDENTE'].includes(status) ? { status } : {};

  try {
    const denuncias = await prisma.denuncia.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: 200,
      include: {
        denunciante: { select: { id: true, nome: true, avatar: true } },
        denunciado: {
          select: { id: true, nome: true, avatar: true, perfil: true, suspenso: true },
        },
        chamado: { select: { id: true, titulo: true } },
      },
    });
    return res.json(denuncias);
  } catch (err) {
    console.error('Erro ao listar denúncias:', err);
    return res.status(500).json({ erro: 'Erro ao listar denúncias' });
  }
}

// PATCH /api/admin/denuncias/:id  { status, respostaAdmin, suspenderDenunciado }
async function julgarDenuncia(req, res) {
  const { id } = req.params;
  const { status, respostaAdmin, suspenderDenunciado } = req.body;

  if (!['PROCEDENTE', 'IMPROCEDENTE'].includes(status)) {
    return res.status(400).json({ erro: 'status deve ser PROCEDENTE ou IMPROCEDENTE' });
  }

  try {
    const denuncia = await prisma.denuncia.findUnique({ where: { id } });
    if (!denuncia) return res.status(404).json({ erro: 'Denúncia não encontrada' });
    if (denuncia.status !== 'PENDENTE') {
      return res.status(409).json({ erro: 'Esta denúncia já foi julgada' });
    }

    if (status === 'PROCEDENTE' && suspenderDenunciado && denuncia.denunciadoId === req.usuario.id) {
      return res.status(400).json({ erro: 'Você não pode suspender a si mesmo' });
    }

    await prisma.denuncia.update({
      where: { id },
      data: {
        status,
        respostaAdmin: respostaAdmin?.trim() || null,
        resolvidoEm: new Date(),
      },
    });

    if (status === 'PROCEDENTE' && suspenderDenunciado) {
      await aplicarSuspensao(
        req.app.get('io'),
        denuncia.denunciadoId,
        true,
        (respostaAdmin?.trim() || 'Denúncia procedente').slice(0, 200)
      );
    }

    const atualizada = await prisma.denuncia.findUnique({
      where: { id },
      include: {
        denunciante: { select: { id: true, nome: true, avatar: true } },
        denunciado: {
          select: { id: true, nome: true, avatar: true, perfil: true, suspenso: true },
        },
        chamado: { select: { id: true, titulo: true } },
      },
    });
    return res.json(atualizada);
  } catch (err) {
    console.error('Erro ao julgar denúncia:', err);
    return res.status(500).json({ erro: 'Erro ao julgar denúncia' });
  }
}

module.exports = {
  visaoGeral,
  listarUsuarios,
  alterarPerfil,
  alterarSuspensao,
  listarDenuncias,
  julgarDenuncia,
};
