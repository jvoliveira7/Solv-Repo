const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  try {
    // Perfil e suspensão vêm do banco, não do JWT (que vive 7 dias): assim
    // uma restrição ou mudança de função feita por um ADMIN vale na hora.
    const atual = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { perfil: true, suspenso: true, motivoSuspensao: true },
    });

    if (!atual) return res.status(401).json({ erro: 'Usuário não encontrado' });

    if (atual.suspenso) {
      return res.status(403).json({
        erro: atual.motivoSuspensao
          ? `Conta suspensa: ${atual.motivoSuspensao}`
          : 'Conta suspensa por um administrador',
        suspensa: true,
      });
    }

    req.usuario = { ...payload, perfil: atual.perfil }; // { id, nome, email, perfil }
    next();
  } catch (err) {
    console.error('Erro ao validar usuário na autenticação:', err);
    return res.status(500).json({ erro: 'Erro ao validar sessão' });
  }
}

function apenasAdmin(req, res, next) {
  if (req.usuario.perfil !== 'ADMIN') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

function apenasTecnico(req, res, next) {
  if (req.usuario.perfil !== 'TECNICO' && req.usuario.perfil !== 'ADMIN') {
    return res.status(403).json({ erro: 'Acesso restrito a técnicos' });
  }
  next();
}

module.exports = { autenticar, apenasAdmin, apenasTecnico };