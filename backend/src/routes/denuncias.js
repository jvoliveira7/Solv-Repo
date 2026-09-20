const { Router } = require('express');
const { criar, minhaDoChamado } = require('../controllers/denunciaController');
const { autenticar } = require('../middlewares/auth');

const router = Router();

// Montado em /api/denuncias (server.js)
router.use(autenticar);

router.post('/', criar);
router.get('/chamado/:chamadoId', minhaDoChamado);

module.exports = router;
