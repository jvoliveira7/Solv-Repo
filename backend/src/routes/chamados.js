const { Router } = require('express');
const {
  criar,
  listar,
  contarPorGrupo,
  estatisticasTecnico,
  buscarPorId,
  atualizarStatus,
  adicionarComentario,
  avaliar,
} = require('../controllers/chamadoController');
const { autenticar, apenasTecnico } = require('../middlewares/auth');

const router = Router();

//todasas rotas exigem autenticação
router.use(autenticar);

router.post('/', criar);                                        // qualquer usuário autenticado
router.get('/', listar);                                        // usuário vê os próprios, técnico/admin vê todos
router.get('/contagem', contarPorGrupo);                        // contagem por grupo — precisa vir antes de /:id
router.get('/estatisticas-tecnico', apenasTecnico, estatisticasTecnico); // idem
router.get('/:id', buscarPorId);                                // com guard interno
router.patch('/:id/status', apenasTecnico, atualizarStatus);   // só técnico/admin
router.post('/:id/comentarios', adicionarComentario);           // qualquer autenticado (guard interno)
router.post('/:id/avaliacao', avaliar);                         // usuário solicitante (guard interno)

module.exports = router;
