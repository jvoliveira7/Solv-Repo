const { Router } = require('express');
const { registro, registroTecnico, login, esqueciSenha, redefinirSenha, me, atualizarAvatar, atualizarPushToken } = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.post('/registro', registro);
router.post('/registro-tecnico', registroTecnico);
router.post('/login', login);
router.post('/esqueci-senha', esqueciSenha);
router.post('/redefinir-senha', redefinirSenha);
router.get('/me', autenticar, me);
router.patch('/avatar', autenticar, atualizarAvatar);
router.patch('/push-token', autenticar, atualizarPushToken);

module.exports = router;
