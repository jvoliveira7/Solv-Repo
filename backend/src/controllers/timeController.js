const prisma = require('../config/prisma');

const CATEGORIAS_VALIDAS = ['HARDWARE', 'SOFTWARE', 'REDE', 'ACESSO', 'IMPRESSORA', 'OUTRO'];

const SELECT_MEMBRO = { id: true, nome: true, email: true, avatar: true, setor: true, perfil: true, adminDoTime: true };

// Quem pode mexer num time: o ADMIN global do sistema (manda em qualquer
// time) ou o admin designado daquele time específico.
async function podeGerenciar(usuarioJwt, timeId) {
  if (usuarioJwt.perfil === 'ADMIN') return true;

  const eu = await prisma.usuario.findUnique({
    where: { id: usuarioJwt.id },
    select: { timeId: true, adminDoTime: true },
  });

  return !!eu?.adminDoTime && eu.timeId === timeId;
}

function categoriasInvalidas(categorias) {
  if (!Array.isArray(categorias) || categorias.length === 0) return 'Informe ao menos uma categoria';
  const fora = categorias.filter((c) => !CATEGORIAS_VALIDAS.includes(c));
  if (fora.length > 0) return `Categoria inválida: ${fora.join(', ')}`;
  return null;
}

// POST /api/times  (apenas ADMIN global)
async function criar(req, res) {
  const { nome, categorias, adminId } = req.body;

  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome do time é obrigatório' });
  if (nome.trim().length > 80) return res.status(400).json({ erro: 'O nome do time pode ter no máximo 80 caracteres' });

  const erroCategoria = categoriasInvalidas(categorias);
  if (erroCategoria) return res.status(400).json({ erro: erroCategoria });

  try {
    // O primeiro admin do time é opcional na criação — dá pra criar o time
    // vazio e designar depois.
    if (adminId) {
      const admin = await prisma.usuario.findUnique({ where: { id: adminId } });
      if (!admin) return res.status(404).json({ erro: 'Usuário informado como admin não encontrado' });
      if (admin.perfil === 'USUARIO') {
        return res.status(400).json({ erro: 'Só técnicos ou admins podem fazer parte de um time' });
      }
    }

    const time = await prisma.time.create({
      data: { nome: nome.trim(), categorias },
    });

    if (adminId) {
      await prisma.usuario.update({
        where: { id: adminId },
        data: { timeId: time.id, adminDoTime: true },
      });
      req.app.get('io')?.in(`usuario:${adminId}`).socketsJoin(`time:${time.id}`);
    }

    const criado = await prisma.time.findUnique({
      where: { id: time.id },
      include: { membros: { select: SELECT_MEMBRO } },
    });

    return res.status(201).json(criado);
  } catch (err) {
    console.error('Erro ao criar time:', err);
    return res.status(500).json({ erro: 'Erro ao criar time' });
  }
}

// GET /api/times
async function listar(req, res) {
  try {
    const times = await prisma.time.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { membros: true } } },
    });

    return res.json(times);
  } catch (err) {
    console.error('Erro ao listar times:', err);
    return res.status(500).json({ erro: 'Erro ao listar times' });
  }
}

// GET /api/times/:id
async function buscarPorId(req, res) {
  const { id } = req.params;

  try {
    const time = await prisma.time.findUnique({
      where: { id },
      include: { membros: { select: SELECT_MEMBRO, orderBy: { nome: 'asc' } } },
    });

    if (!time) return res.status(404).json({ erro: 'Time não encontrado' });

    return res.json({ ...time, podeGerenciar: await podeGerenciar(req.usuario, id) });
  } catch (err) {
    console.error('Erro ao buscar time:', err);
    return res.status(500).json({ erro: 'Erro ao buscar time' });
  }
}

// GET /api/times/meu — atalho pro técnico abrir direto o time dele
async function meuTime(req, res) {
  try {
    const eu = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { timeId: true },
    });

    if (!eu?.timeId) return res.json({ time: null });

    const time = await prisma.time.findUnique({
      where: { id: eu.timeId },
      include: { membros: { select: SELECT_MEMBRO, orderBy: { nome: 'asc' } } },
    });

    return res.json({ time: { ...time, podeGerenciar: await podeGerenciar(req.usuario, eu.timeId) } });
  } catch (err) {
    console.error('Erro ao buscar meu time:', err);
    return res.status(500).json({ erro: 'Erro ao buscar seu time' });
  }
}

// PATCH /api/times/:id
async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, categorias } = req.body;

  try {
    const time = await prisma.time.findUnique({ where: { id } });
    if (!time) return res.status(404).json({ erro: 'Time não encontrado' });

    if (!(await podeGerenciar(req.usuario, id))) {
      return res.status(403).json({ erro: 'Apenas o admin do time pode alterá-lo' });
    }

    const dados = {};
    if (nome?.trim()) {
      if (nome.trim().length > 80) {
        return res.status(400).json({ erro: 'O nome do time pode ter no máximo 80 caracteres' });
      }
      dados.nome = nome.trim();
    }
    if (categorias !== undefined) {
      const erroCategoria = categoriasInvalidas(categorias);
      if (erroCategoria) return res.status(400).json({ erro: erroCategoria });
      dados.categorias = categorias;
    }

    const atualizado = await prisma.time.update({
      where: { id },
      data: dados,
      include: { membros: { select: SELECT_MEMBRO, orderBy: { nome: 'asc' } } },
    });

    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao atualizar time:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar time' });
  }
}

// DELETE /api/times/:id  (apenas ADMIN global)
// Os técnicos do time não são apagados: só ficam sem time (voltam pra fila
// geral). O chat do time vai junto — ele só existe dentro do time.
async function excluir(req, res) {
  const { id } = req.params;

  try {
    const time = await prisma.time.findUnique({
      where: { id },
      include: { _count: { select: { membros: true, mensagens: true } } },
    });
    if (!time) return res.status(404).json({ erro: 'Time não encontrado' });

    await prisma.$transaction([
      prisma.mensagemTime.deleteMany({ where: { timeId: id } }),
      prisma.usuario.updateMany({
        where: { timeId: id },
        data: { timeId: null, adminDoTime: false },
      }),
      prisma.time.delete({ where: { id } }),
    ]);

    // tira os sockets já conectados da sala do time
    req.app.get('io')?.socketsLeave(`time:${id}`);

    return res.json({
      ok: true,
      membrosLiberados: time._count.membros,
      mensagensApagadas: time._count.mensagens,
    });
  } catch (err) {
    console.error('Erro ao excluir time:', err);
    return res.status(500).json({ erro: 'Erro ao excluir time' });
  }
}

// POST /api/times/:id/membros
async function adicionarMembro(req, res) {
  const { id } = req.params;
  const { usuarioId } = req.body;

  if (!usuarioId) return res.status(400).json({ erro: 'usuarioId é obrigatório' });

  try {
    const time = await prisma.time.findUnique({ where: { id } });
    if (!time) return res.status(404).json({ erro: 'Time não encontrado' });

    if (!(await podeGerenciar(req.usuario, id))) {
      return res.status(403).json({ erro: 'Apenas o admin do time pode adicionar membros' });
    }

    const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado' });
    if (alvo.perfil === 'USUARIO') {
      return res.status(400).json({ erro: 'Só técnicos ou admins podem fazer parte de um time' });
    }
    if (alvo.timeId === id) return res.status(409).json({ erro: 'Esse técnico já está neste time' });

    // Um técnico pertence a um time por vez — entrar num time novo tira do
    // anterior automaticamente (e perde o papel de admin do antigo).
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { timeId: id, adminDoTime: false },
    });

    // A sala do chat do time é assinada na conexão do socket — sem isto quem
    // entra agora só receberia mensagens ao vivo depois de reconectar.
    const io = req.app.get('io');
    if (io) {
      if (alvo.timeId) io.in(`usuario:${usuarioId}`).socketsLeave(`time:${alvo.timeId}`);
      io.in(`usuario:${usuarioId}`).socketsJoin(`time:${id}`);
    }

    const atualizado = await prisma.time.findUnique({
      where: { id },
      include: { membros: { select: SELECT_MEMBRO, orderBy: { nome: 'asc' } } },
    });

    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao adicionar membro:', err);
    return res.status(500).json({ erro: 'Erro ao adicionar membro ao time' });
  }
}

// DELETE /api/times/:id/membros/:usuarioId
async function removerMembro(req, res) {
  const { id, usuarioId } = req.params;

  try {
    const time = await prisma.time.findUnique({ where: { id } });
    if (!time) return res.status(404).json({ erro: 'Time não encontrado' });

    if (!(await podeGerenciar(req.usuario, id))) {
      return res.status(403).json({ erro: 'Apenas o admin do time pode remover membros' });
    }

    const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!alvo || alvo.timeId !== id) {
      return res.status(404).json({ erro: 'Esse usuário não faz parte deste time' });
    }

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { timeId: null, adminDoTime: false },
    });

    req.app.get('io')?.in(`usuario:${usuarioId}`).socketsLeave(`time:${id}`);

    const atualizado = await prisma.time.findUnique({
      where: { id },
      include: { membros: { select: SELECT_MEMBRO, orderBy: { nome: 'asc' } } },
    });

    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao remover membro:', err);
    return res.status(500).json({ erro: 'Erro ao remover membro do time' });
  }
}

// PATCH /api/times/:id/membros/:usuarioId/admin
async function definirAdminDoMembro(req, res) {
  const { id, usuarioId } = req.params;
  const { adminDoTime } = req.body;

  if (typeof adminDoTime !== 'boolean') {
    return res.status(400).json({ erro: 'adminDoTime deve ser true ou false' });
  }

  try {
    const time = await prisma.time.findUnique({ where: { id } });
    if (!time) return res.status(404).json({ erro: 'Time não encontrado' });

    if (!(await podeGerenciar(req.usuario, id))) {
      return res.status(403).json({ erro: 'Apenas o admin do time pode mudar isso' });
    }

    const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!alvo || alvo.timeId !== id) {
      return res.status(404).json({ erro: 'Esse usuário não faz parte deste time' });
    }

    // Evita o time ficar órfão: quem está se rebaixando precisa deixar
    // outro admin no lugar (ADMIN global sempre consegue mexer, então não
    // trava de vez).
    if (!adminDoTime) {
      const outrosAdmins = await prisma.usuario.count({
        where: { timeId: id, adminDoTime: true, NOT: { id: usuarioId } },
      });
      if (outrosAdmins === 0) {
        return res.status(400).json({ erro: 'O time precisa ter ao menos um admin — promova outro antes' });
      }
    }

    await prisma.usuario.update({ where: { id: usuarioId }, data: { adminDoTime } });

    const atualizado = await prisma.time.findUnique({
      where: { id },
      include: { membros: { select: SELECT_MEMBRO, orderBy: { nome: 'asc' } } },
    });

    return res.json(atualizado);
  } catch (err) {
    console.error('Erro ao definir admin do time:', err);
    return res.status(500).json({ erro: 'Erro ao definir admin do time' });
  }
}

// GET /api/times/:id/mensagens — histórico do chat em grupo
async function listarMensagens(req, res) {
  const { id } = req.params;

  try {
    const eu = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { timeId: true },
    });

    const souMembro = eu?.timeId === id;
    if (!souMembro && req.usuario.perfil !== 'ADMIN') {
      return res.status(403).json({ erro: 'Acesso restrito aos membros do time' });
    }

    const mensagens = await prisma.mensagemTime.findMany({
      where: { timeId: id },
      orderBy: { criadoEm: 'asc' },
      include: { autor: { select: { id: true, nome: true, avatar: true, perfil: true } } },
    });

    return res.json(mensagens);
  } catch (err) {
    console.error('Erro ao listar mensagens do time:', err);
    return res.status(500).json({ erro: 'Erro ao listar mensagens do time' });
  }
}

// GET /api/times/tecnicos-disponiveis — pra tela de convidar membro
async function tecnicosDisponiveis(req, res) {
  try {
    const tecnicos = await prisma.usuario.findMany({
      where: { perfil: { in: ['TECNICO', 'ADMIN'] } },
      select: { ...SELECT_MEMBRO, timeId: true, time: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });

    return res.json(tecnicos);
  } catch (err) {
    console.error('Erro ao listar técnicos:', err);
    return res.status(500).json({ erro: 'Erro ao listar técnicos' });
  }
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  meuTime,
  atualizar,
  excluir,
  adicionarMembro,
  removerMembro,
  definirAdminDoMembro,
  listarMensagens,
  tecnicosDisponiveis,
};
