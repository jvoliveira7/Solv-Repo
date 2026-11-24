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

//Cadastro 
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MIN = 6;
const SENHA_MAX_BYTES = 72; // o bcrypt ignora tudo que passa de 72 bytes

// Hash descartável: no login, quando o e-mail não existe, comparamos contra ele
// pra que a resposta demore o mesmo tempo e não revele quais e-mails têm conta.
const HASH_FALSO = bcrypt.hashSync('solv-hash-descartavel', 10);

// E-mail sempre guardado e buscado sem espaços nas pontas e em minúsculas:
// "Ana@x.com" e "ana@x.com" são a mesma conta.
function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

// Mesma regra de senha no cadastro e na redefinição (antes só a tela validava).
function erroDeSenha(senha) {
  if (typeof senha !== 'string' || senha.length < SENHA_MIN) {
    return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres`;
  }
  if (Buffer.byteLength(senha, 'utf8') > SENHA_MAX_BYTES) {
    return `A senha é longa demais (máximo de ${SENHA_MAX_BYTES} bytes)`;
  }
  return null;
}

// Compara o código recebido com o esperado em tempo constante. Os dois passam
// por SHA-256 antes pra terem o mesmo tamanho (exigência do timingSafeEqual).
function codigoConfere(recebido, esperado) {
  if (typeof recebido !== 'string' || !esperado) return false;
  const a = crypto.createHash('sha256').update(recebido.trim()).digest();
  const b = crypto.createHash('sha256').update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

// Fluxo único de cadastro público. O que muda entre Usuário e Técnico é só
// o perfil gravado e qual código de acesso (variável do .env) é exigido.
// O perfil vem SEMPRE daqui, nunca do corpo da requisição.
async function criarConta(req, res, { perfil, envCodigo, msgIndisponivel, msgCodigoInvalido, rotuloLog }) {
  const { nome, senha, setor, codigoAcesso } = req.body;
  const email = normalizarEmail(req.body.email);
  const nomeLimpo = typeof nome === 'string' ? nome.trim() : '';
  const setorLimpo = typeof setor === 'string' ? setor.trim() : '';

  if (!nomeLimpo || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }

  const codigoEsperado = process.env[envCodigo];
  if (!codigoEsperado) {
    console.error(`${envCodigo} não configurado no .env`);
    return res.status(500).json({ erro: msgIndisponivel });
  }
  if (!codigoConfere(codigoAcesso, codigoEsperado)) {
    return res.status(403).json({ erro: msgCodigoInvalido });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ erro: 'E-mail inválido' });
  }
  const erroSenha = erroDeSenha(senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  const erroTamanho = erroDeTamanhoNoCadastro({ nome: nomeLimpo, email, setor: setorLimpo });
  if (erroTamanho) return res.status(400).json({ erro: erroTamanho });

  try {
    const emailJaExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailJaExiste) {
      return res.status(409).json({ erro: 'Este e-mail já está em uso' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome: nomeLimpo,
        email,
        senha: senhaHash,
        setor: setorLimpo || null,
        perfil,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        setor: true,
        avatar: true,
        especialidades: true,
        perfil: true,
        criadoEm: true,
      },
    });

    const token = gerarToken(usuario);

    return res.status(201).json({ usuario, token });
  } catch (err) {
    // Duas requisições simultâneas com o mesmo e-mail: o banco barra (unique).
    if (err.code === 'P2002') {
      return res.status(409).json({ erro: 'Este e-mail já está em uso' });
    }
    console.error(`Erro no ${rotuloLog}:`, err);
    return res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
}

//POST /api/auth/registro
// Exige o código de acesso da organização (ORGANIZACAO_ACCESS_CODE): cada
// instalação do Solv pertence a uma organização e só quem tem o código
// (divulgado internamente) cria conta de Usuário Comum nela (RN02).
function registro(req, res) {
  return criarConta(req, res, {
    perfil: 'USUARIO',
    envCodigo: 'ORGANIZACAO_ACCESS_CODE',
    msgIndisponivel: 'Cadastro indisponível no momento',
    msgCodigoInvalido: 'Código de acesso da organização inválido',
    rotuloLog: 'registro',
  });
}

//POST /api/auth/registro-tecnico
// Cadastro público de Técnico: exige o TECNICO_ACCESS_CODE. Sem o código
// correto, vira 403 (não dá pra um cliente se promover a técnico sozinho).
function registroTecnico(req, res) {
  return criarConta(req, res, {
    perfil: 'TECNICO',
    envCodigo: 'TECNICO_ACCESS_CODE',
    msgIndisponivel: 'Cadastro de técnico indisponível no momento',
    msgCodigoInvalido: 'Código de acesso técnico inválido',
    rotuloLog: 'registro de técnico',
  });
}

//POST /api/auth/login
async function login(req, res) {
  const email = normalizarEmail(req.body.email);
  const { senha } = req.body;

  if (!email || typeof senha !== 'string' || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      await bcrypt.compare(senha, HASH_FALSO); // mesmo custo de tempo de um login real
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
        especialidades: usuario.especialidades,
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

//POST /api/auth/esqueci-senha
//sempre responde a mesma coisa
async function esqueciSenha(req, res) {
  const email = normalizarEmail(req.body.email);
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
  const erroSenha = erroDeSenha(novaSenha);
  if (erroSenha) {
    return res.status(400).json({ erro: erroSenha });
  }

  const erroGenerico = { erro: 'Código inválido ou expirado' };

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: normalizarEmail(email) } });

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
        especialidades: true,
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
        especialidades: true,
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
        especialidades: true,
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

// ─── Especialidades do técnico ───────────────────────────────────────────────

// Tags pré-definidas de áreas de atuação. Os ids são estáveis; os rótulos
// exibidos ficam no app (mobile/src/utils/especialidades.js) — manter as duas
// listas iguais ao acrescentar uma tag nova.
const ESPECIALIDADES = ['SUPORTE', 'REDES', 'IMPRESSORAS', 'HARDWARE', 'SOFTWARE', 'ACESSOS', 'SERVIDORES', 'SEGURANCA'];
const MAX_ESPECIALIDADES = 4;

//PATCH /api/auth/especialidades
// Só técnico/admin escolhe as próprias áreas de atuação. Um array vazio limpa.
async function atualizarEspecialidades(req, res) {
  if (req.usuario.perfil !== 'TECNICO' && req.usuario.perfil !== 'ADMIN') {
    return res.status(403).json({ erro: 'Apenas técnicos podem definir especialidades' });
  }

  const { especialidades } = req.body;
  if (!Array.isArray(especialidades) || !especialidades.every((e) => typeof e === 'string')) {
    return res.status(400).json({ erro: 'Envie a lista de especialidades' });
  }

  const unicas = [...new Set(especialidades)];
  const invalida = unicas.find((e) => !ESPECIALIDADES.includes(e));
  if (invalida) {
    return res.status(400).json({ erro: 'Especialidade inválida' });
  }
  if (unicas.length > MAX_ESPECIALIDADES) {
    return res.status(400).json({ erro: `Escolha no máximo ${MAX_ESPECIALIDADES} especialidades` });
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { especialidades: unicas },
      select: {
        id: true,
        nome: true,
        email: true,
        setor: true,
        avatar: true,
        especialidades: true,
        perfil: true,
        criadoEm: true,
      },
    });

    return res.json(usuario);
  } catch (err) {
    console.error('Erro ao atualizar especialidades:', err);
    return res.status(500).json({ erro: 'Erro ao atualizar especialidades' });
  }
}

module.exports = { registro, registroTecnico, login, esqueciSenha, redefinirSenha, me, atualizarAvatar, atualizarSetor, atualizarEspecialidades, atualizarPushToken };
