const { Router } = require('express');
const { buscarSessao, listarMensagens } = require('../controllers/chatController');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar);

router.get('/chamados/:id/chat', buscarSessao);
router.get('/chat/:sessaoId/mensagens', listarMensagens);

module.exports = router;
