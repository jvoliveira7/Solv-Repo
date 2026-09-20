const { Router } = require('express');
const {
  visaoGeral,
  listarUsuarios,
  alterarPerfil,
  alterarSuspensao,
  listarDenuncias,
  julgarDenuncia,
} = require('../controllers/adminController');
const { autenticar, apenasAdmin } = require('../middlewares/auth');

const router = Router();

// Montado em /api/admin (server.js) — tudo aqui é só pra ADMIN global
router.use(autenticar, apenasAdmin);

router.get('/visao-geral', visaoGeral);

router.get('/usuarios', listarUsuarios);
router.patch('/usuarios/:id/perfil', alterarPerfil);
router.patch('/usuarios/:id/suspensao', alterarSuspensao);

router.get('/denuncias', listarDenuncias);
router.patch('/denuncias/:id', julgarDenuncia);

module.exports = router;
