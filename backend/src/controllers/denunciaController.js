const prisma = require('../config/prisma');

const MOTIVOS = ['COMPORTAMENTO', 'RESPONSABILIDADE', 'OUTRO'];

// POST /api/denuncias  { chamadoId, motivo, descricao }
// Só quem abriu o chamado denuncia o técnico que o atendeu, uma vez por chamado.
async function criar(req, res) {
  const { chamadoId, motivo, descricao } = req.body;

  if (!chamadoId) return res.status(400).json({ erro: 'chamadoId é obrigatório' });
  if (!MOTIVOS.includes(motivo)) return res.status(400).json({ erro: 'Motivo inválido' });
  if (!descricao?.trim() || descricao.trim().length < 10) {
    return res.status(400).json({ erro: 'Descreva o ocorrido (mínimo de 10 caracteres)' });
  }

  try {
    const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    if (chamado.solicitanteId !== req.usuario.id) {
      return res.status(403).json({ erro: 'Apenas quem abriu o chamado pode denunciar' });
    }
    if (!chamado.tecnicoId) {
      return res.status(400).json({ erro: 'Este chamado ainda não tem um técnico atribuído' });
    }

    const denuncia = await prisma.denuncia.create({
      data: {
        motivo,
        descricao: descricao.trim(),
        chamadoId,
        denuncianteId: req.usuario.id,
        denunciadoId: chamado.tecnicoId,
      },
    });

    return res.status(201).json(denuncia);
  } catch (err) {
    // a constraint unique (chamado + denunciante) protege de duplicidade e de corrida
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Você já denunciou este atendimento' });
    }
    console.error('Erro ao criar denúncia:', err);
    return res.status(500).json({ erro: 'Erro ao registrar denúncia' });
  }
}

// GET /api/denuncias/chamado/:chamadoId — a denúncia do próprio usuário nesse chamado (ou null)
async function minhaDoChamado(req, res) {
  try {
    const denuncia = await prisma.denuncia.findUnique({
      where: {
        chamadoId_denuncianteId: { chamadoId: req.params.chamadoId, denuncianteId: req.usuario.id },
      },
      select: { id: true, motivo: true, status: true, criadoEm: true, respostaAdmin: true },
    });
    return res.json({ denuncia });
  } catch (err) {
    console.error('Erro ao buscar denúncia do chamado:', err);
    return res.status(500).json({ erro: 'Erro ao buscar denúncia' });
  }
}

module.exports = { criar, minhaDoChamado };
