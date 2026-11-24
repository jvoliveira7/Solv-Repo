const { Router } = require('express');
const { registro, registroTecnico, login, esqueciSenha, redefinirSenha, me, atualizarAvatar, atualizarSetor, atualizarEspecialidades, atualizarPushToken } = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

const router = Router();

function limitador(maxFalhas) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: maxFalhas,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
  });
}
const limiteCadastro = limitador(10);
const limiteLogin = limitador(20);

router.post('/registro', limiteCadastro, registro);
router.post('/registro-tecnico', limiteCadastro, registroTecnico);
router.post('/login', limiteLogin, login);
router.post('/esqueci-senha', esqueciSenha);
router.post('/redefinir-senha', redefinirSenha);
router.get('/me', autenticar, me);
router.patch('/avatar', autenticar, atualizarAvatar);
router.patch('/setor', autenticar, atualizarSetor);
router.patch('/especialidades', autenticar, atualizarEspecialidades);
router.patch('/push-token', autenticar, atualizarPushToken);

module.exports = router;