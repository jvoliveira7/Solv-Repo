const { Router } = require('express');
const { registro, login, me, atualizarAvatar } = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.post('/registro', registro);
router.post('/login', login);
router.get('/me', autenticar, me);
router.patch('/avatar', autenticar, atualizarAvatar);

module.exports = router;
