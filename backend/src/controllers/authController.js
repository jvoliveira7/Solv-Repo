const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { enviarCodigoRedefinicao } = require('../services/emailService');

// Limites das colunas (VARCHAR) — validar aqui evita um erro 500 do banco.
function erroDeTamanhoNoCadastro({ nome, email, setor }) {
  if (nome && nome.length > 100) return 'O nome pode ter no máximo 100 caracteres';
  if (email && email.length > 255) return 'O e-mail pode ter no máximo 255 caracteres';
  if (setor && setor.length > 80) return 'O setor pode ter no máximo 80 caracteres';
  return null;
}

//POST /api/auth/registro
async function registro(req, res) {
  const { nome, email, senha, setor } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }

  const erroTamanho = erroDeTamanhoNoCadastro({ nome, email, setor });
  if (erroTamanho) return res.status(400).json({ erro: erroTamanho });

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

//POST /api/auth/registro-tecnico
// Tela separada da de usuário comum — exige um código de acesso (definido
// por fora, em TECNICO_ACCESS_CODE) além dos dados normais. É o único jeito
// de nascer TECNICO direto no cadastro; sem o código, vira erro 403 (não
// cai silenciosamente pra USUARIO, senão a pessoa nem entenderia por quê).
async function registroTecnico(req, res) {
  const { nome, email, senha, setor, codigoAcesso } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }

  if (!process.env.TECNICO_ACCESS_CODE) {
    console.error('TECNICO_ACCESS_CODE não configurado no .env');
    return res.status(500).json({ erro: 'Cadastro de técnico indisponível no momento' });
  }

  if (codigoAcesso !== process.env.TECNICO_ACCESS_CODE) {
    return res.status(403).json({ erro: 'Código de acesso técnico inválido' });
  }

  const erroTamanho = erroDeTamanhoNoCadastro({ nome, email, setor });
  if (erroTamanho) return res.status(400).json({ erro: erroTamanho });

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
        perfil: 'TECNICO',
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
    console.error('Erro no registro de técnico:', err);
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

    if (usuario.suspenso) {
      return res.status(403).json({
        erro: usuario.motivoSuspensao
          ? `Conta suspensa: ${usuario.motivoSuspensao}`
          : 'Conta suspensa por um administrador',
      });
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

const VALIDADE_CODIGO_MIN = 15; // RN19
const MAX_TENTATIVAS_CODIGO = 5;

//POST /api/auth/esqueci-senha  { email }
// Sempre responde a mesma coisa, exista o e-mail ou não — senão a rota
// serviria pra descobrir quem tem conta.
async function esqueciSenha(req, res) {
  const email = req.body.email?.trim();
  const resposta = {
    mensagem: 'Se este e-mail estiver cadastrado, enviamos um código de 6 dígitos para ele.',
  };

  if (!email) return res.status(400).json({ erro: 'Informe o e-mail' });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.json(resposta);

    // Reenvio só depois de 1 minuto — evita usar a rota pra encher a caixa de alguém
    const faltamMs = usuario.resetExpiraEm ? usuario.resetExpiraEm.getTime() - Date.now() : 0;
    if (faltamMs > (VALIDADE_CODIGO_MIN - 1) * 60 * 1000) return res.json(resposta);

    const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetCodigoHash: await bcrypt.hash(codigo, 10),
        resetExpiraEm: new Date(Date.now() + VALIDADE_CODIGO_MIN * 60 * 1000),
        resetTentativas: 0,
      },
    });

    try {
      await enviarCodigoRedefinicao({
        para: usuario.email,
        nome: usuario.nome,
        codigo,
        validadeMinutos: VALIDADE_CODIGO_MIN,
      });
    } catch (err) {
      // falha de SMTP não pode revelar nada ao cliente; fica só no log do servidor
      console.error('Erro ao enviar e-mail de redefinição:', err);
    }

    return res.json(resposta);
  } catch (err) {
    console.error('Erro em esqueci-senha:', err);
    return res.status(500).json({ erro: 'Erro ao processar o pedido' });
  }
}

//POST /api/auth/redefinir-senha  { email, codigo, novaSenha }
async function redefinirSenha(req, res) {
  const { email, codigo, novaSenha } = req.body;

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ erro: 'E-mail, código e nova senha são obrigatórios' });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres' });
  }

  const erroGenerico = { erro: 'Código inválido ou expirado' };

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: email.trim() } });

    if (
      !usuario?.resetCodigoHash
      || !usuario.resetExpiraEm
      || usuario.resetExpiraEm.getTime() < Date.now()
      || usuario.resetTentativas >= MAX_TENTATIVAS_CODIGO
    ) {
      return res.status(400).json(erroGenerico);
    }

    const confere = await bcrypt.compare(String(codigo).trim(), usuario.resetCodigoHash);
    if (!confere) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetTentativas: { increment: 1 } },
      });
      return res.status(400).json(erroGenerico);
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: await bcrypt.hash(novaSenha, 10),
        resetCodigoHash: null,
        resetExpiraEm: null,
        resetTentativas: 0,
      },
    });

    return res.json({ mensagem: 'Senha redefinida com sucesso' });
  } catch (err) {
    console.error('Erro em redefinir-senha:', err);
    return res.status(500).json({ erro: 'Erro ao redefinir a senha' });
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

// PATCH /api/auth/setor  { setor }  — string vazia ou null remove o setor
async function atualizarSetor(req, res) {
  const { setor } = req.body;

  if (setor !== null && setor !== undefined && typeof setor !== 'string') {
    return res.status(400).json({ erro: 'Setor inválido' });
  }

  const novoSetor = setor?.trim() || null;
  if (novoSetor && novoSetor.length > 80) {
    return res.status(400).json({ erro: 'O setor pode ter no máximo 80 caracteres' });
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { setor: novoSetor },
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
    console.error('Erro ao atualizar setor:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar setor' });
  }
}

async function atualizarPushToken(req, res) {
  const { pushToken } = req.body;

  if (pushToken && typeof pushToken !== 'string') {
    return res.status(400).json({ erro: 'Token inválido' });
  }

  try {
    // O mesmo aparelho pode ter sido usado por outra conta antes — solta o
    // token de quem tinha, senão a notificação ia pro dono errado.
    if (pushToken) {
      await prisma.usuario.updateMany({
        where: { pushToken, NOT: { id: req.usuario.id } },
        data: { pushToken: null },
      });
    }

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { pushToken: pushToken || null },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao atualizar push token:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar token de notificação' });
  }
}

function gerarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { registro, registroTecnico, login, esqueciSenha, redefinirSenha, me, atualizarAvatar, atualizarSetor, atualizarPushToken };
