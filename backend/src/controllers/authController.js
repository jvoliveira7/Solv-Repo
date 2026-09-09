const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

//POST /api/auth/registro
async function registro(req, res) {
  const { nome, email, senha, setor } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }

  try {
    const emailJaExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailJaExiste) {
      return res.status(409).json({ erro: 'Este e-mail já está em uso' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        setor: setor || null,
        // Registro público nunca aceita perfil vindo do cliente — sempre
        // USUARIO. TECNICO/ADMIN só são criados por um administrador.
        perfil: 'USUARIO',
      },
      select: {
        id: true,
        nome: true,
        email: true,
        setor: true,
        avatar: true,
        perfil: true,
        criadoEm: true,
      },
    });

    const token = gerarToken(usuario);

    return res.status(201).json({ usuario, token });
  } catch (err) {
    console.error('Erro no registro:', err);
    return res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
}

//POST /api/auth/login
async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    };

    const token = gerarToken(payload);

    return res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        setor: usuario.setor,
        avatar: usuario.avatar,
        perfil: usuario.perfil,
      },
      token,
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro ao realizar login' });
  }
}

//GET /api/auth/me
async function me(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: {
        id: true,
        nome: true,
        email: true,
        setor: true,
        avatar: true,
        perfil: true,
        criadoEm: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    return res.json(usuario);
  } catch (err) {
    console.error('Erro em /me:', err);
    return res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
}

// PATCH /api/auth/avatar
// Recebe { avatar: "data:image/jpeg;base64,..." } ou { avatar: null } pra remover.
// Guardado como base64 direto no banco — sem storage de arquivo externo no
// projeto ainda. Funciona bem pra escala de TCC/demo; não é o ideal pra
// produção (infla o banco, sem CDN). Se o projeto crescer, migrar pra um
// bucket (S3/Cloudinary/etc.) e guardar só a URL aqui.
async function atualizarAvatar(req, res) {
  const { avatar } = req.body;

  if (avatar && !avatar.startsWith('data:image/')) {
    return res.status(400).json({ erro: 'Formato de imagem inválido' });
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { avatar: avatar || null },
      select: {
        id: true,
        nome: true,
        email: true,
        setor: true,
        avatar: true,
        perfil: true,
        criadoEm: true,
      },
    });

    return res.json(usuario);
  } catch (err) {
    console.error('Erro ao atualizar avatar:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar avatar' });
  }
}

function gerarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { registro, login, me, atualizarAvatar };
