const { Router } = require('express');
const { buscarSessao, listarMensagens, listarChats, recusarSessao, enviarMensagem } = require('../controllers/chatController');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.use(autenticar);

router.get('/chats', listarChats);
router.get('/chamados/:id/chat', buscarSessao);
router.get('/chat/:sessaoId/mensagens', listarMensagens);

// Ações vindas dos botões da notificação push (app fechado, sem socket)
router.post('/chat/:sessaoId/recusar', recusarSessao);
router.post('/chat/:sessaoId/mensagens', enviarMensagem);

module.exports = router;
