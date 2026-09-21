const { Router } = require('express');
const {
  criar,
  listar,
  buscarPorId,
  meuTime,
  atualizar,
  excluir,
  adicionarMembro,
  removerMembro,
  definirAdminDoMembro,
  listarMensagens,
  tecnicosDisponiveis,
} = require('../controllers/timeController');
const { autenticar, apenasAdmin, apenasTecnico } = require('../middlewares/auth');

const router = Router();

// Time é coisa de equipe técnica — usuário comum não acessa nada aqui.
// Montado em /api/times (server.js), então os paths aqui são relativos.
router.use(autenticar, apenasTecnico);

// Rotas fixas antes das com :id, senão "meu"/"tecnicos-disponiveis" caem no param
router.get('/meu', meuTime);
router.get('/tecnicos-disponiveis', tecnicosDisponiveis);

router.post('/', apenasAdmin, criar); // só ADMIN global cria time do zero
router.get('/', listar);
router.get('/:id', buscarPorId);
router.patch('/:id', atualizar);
router.delete('/:id', apenasAdmin, excluir); // só ADMIN global exclui time

// Guard de admin-do-time fica dentro do controller (podeGerenciar), porque
// depende de qual time é — middleware genérico não daria conta.
router.post('/:id/membros', adicionarMembro);
router.delete('/:id/membros/:usuarioId', removerMembro);
router.patch('/:id/membros/:usuarioId/admin', definirAdminDoMembro);

router.get('/:id/mensagens', listarMensagens);

module.exports = router;
