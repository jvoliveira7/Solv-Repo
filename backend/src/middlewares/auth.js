const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; //id, nome, email, perfil }
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
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
