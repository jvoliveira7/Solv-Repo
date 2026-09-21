const nodemailer = require('nodemailer');

// SMTP vem do .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
// Sem SMTP_HOST configurado (ambiente de desenvolvimento), o e-mail não sai:
// o conteúdo é impresso no console do servidor pra dar pra testar o fluxo.
function criarTransporte() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function enviarEmail({ para, assunto, texto }) {
  const transporte = criarTransporte();

  if (!transporte) {
    console.warn(`[email] SMTP não configurado — e-mail NÃO enviado. Conteúdo para ${para}:\n${texto}`);
    return { enviado: false };
  }

  await transporte.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
  });
  return { enviado: true };
}

async function enviarCodigoRedefinicao({ para, nome, codigo, validadeMinutos }) {
  return enviarEmail({
    para,
    assunto: 'Solv - código para redefinir sua senha',
    texto:
      `Olá, ${nome}!\n\n`
      + `Seu código para redefinir a senha do Solv é: ${codigo}\n\n`
      + `Ele vale por ${validadeMinutos} minutos. Se você não pediu isso, ignore este e-mail: `
      + 'sua senha continua a mesma.\n',
  });
}

module.exports = { enviarEmail, enviarCodigoRedefinicao };
