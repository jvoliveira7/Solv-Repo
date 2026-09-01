/**
 * Teste isolado do fluxo de chat, sem precisar do app mobile.
 * Uso: node test-chat.js
 * Requer: backend rodando em localhost:3000, e dois usuários existentes
 * (um USUARIO, um TECNICO) — ajuste EMAIL_USUARIO/EMAIL_TECNICO abaixo.
 */
const axios = require('axios');
const { io } = require('socket.io-client');

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

const EMAIL_USUARIO = 'maria@solv.com';
const SENHA_USUARIO = '123456';
const EMAIL_TECNICO = 'haki@solv.com';
const SENHA_TECNICO = '123456';

function log(label, ok, detalhe = '') {
  console.log(`${ok ? '✅' : '❌'} ${label}${detalhe ? ' — ' + detalhe : ''}`);
}

async function login(email, senha) {
  const { data } = await axios.post(`${API_URL}/auth/login`, { email, senha });
  return data; // { usuario, token }
}

function conectar(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
    socket.on('erro', (e) => console.log(`   ⚠️  evento 'erro' recebido: ${e.mensagem}`));
  });
}

function esperarEvento(socket, evento, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout esperando '${evento}'`)), timeoutMs);
    socket.once(evento, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

async function criarChamadoTeste(tokenUsuario) {
  const { data } = await axios.post(
    `${API_URL}/chamados`,
    { titulo: 'Teste automatizado de chat', descricao: 'Gerado pelo script', categoria: 'SOFTWARE', prioridade: 'MEDIA' },
    { headers: { Authorization: `Bearer ${tokenUsuario}` } }
  );
  return data;
}

async function main() {
  console.log('--- Login ---');
  const { usuario, token: tokenUsuario } = await login(EMAIL_USUARIO, SENHA_USUARIO);
  const { usuario: tecnico, token: tokenTecnico } = await login(EMAIL_TECNICO, SENHA_TECNICO);
  log('Login usuário', true, usuario.nome);
  log('Login técnico', true, tecnico.nome);

  console.log('\n--- Criar chamado de teste ---');
  const chamado = await criarChamadoTeste(tokenUsuario);
  log('Chamado criado', true, chamado.id);

  console.log('\n--- Conectar sockets ---');
  const socketUsuario = await conectar(tokenUsuario);
  const socketTecnico = await conectar(tokenTecnico);
  log('Socket usuário conectado', true);
  log('Socket técnico conectado', true);

  // ── Teste 1: técnico convida (sem ter assumido o chamado ainda) ──
  console.log('\n--- Teste 1: convite iniciado pelo TÉCNICO (chamado ainda ABERTO) ---');
  const pConviteUsuario = esperarEvento(socketUsuario, 'convite_chat');
  socketTecnico.emit('convidar_chat', { chamadoId: chamado.id });
  let sessaoId;
  try {
    const convite = await pConviteUsuario;
    sessaoId = convite.sessaoId;
    log('Usuário recebeu convite_chat', true, `sessaoId=${sessaoId}`);
  } catch (e) {
    log('Usuário recebeu convite_chat', false, e.message);
    process.exit(1);
  }

  // Confirma que tecnicoId foi auto-atribuído
  const { data: chamadoAtualizado } = await axios.get(`${API_URL}/chamados/${chamado.id}`, {
    headers: { Authorization: `Bearer ${tokenTecnico}` },
  });
  log('tecnicoId auto-atribuído ao convidar', chamadoAtualizado.tecnicoId === tecnico.id, chamadoAtualizado.tecnicoId);

  // ── Teste 2: usuário aceita ──
  console.log('\n--- Teste 2: usuário aceita o convite ---');
  const pAceitoTecnico = esperarEvento(socketTecnico, 'chat_aceito');
  socketUsuario.emit('aceitar_chat', { sessaoId });
  try {
    await pAceitoTecnico;
    log('Técnico recebeu chat_aceito', true);
  } catch (e) {
    log('Técnico recebeu chat_aceito', false, e.message);
  }

  // ── Teste 3: trocar mensagens ──
  console.log('\n--- Teste 3: trocar mensagens ---');
  socketUsuario.emit('entrar_chat', { sessaoId });
  socketTecnico.emit('entrar_chat', { sessaoId });
  await new Promise((r) => setTimeout(r, 300));

  const pMsgTecnico = esperarEvento(socketTecnico, 'nova_mensagem');
  socketUsuario.emit('mensagem', { sessaoId, texto: 'Oi, teste automatizado' });
  try {
    const msg = await pMsgTecnico;
    log('Técnico recebeu nova_mensagem', true, `"${msg.texto}"`);
  } catch (e) {
    log('Técnico recebeu nova_mensagem', false, e.message);
  }

  // ── Teste 4: resolver o chamado deve encerrar o chat como histórico ──
  console.log('\n--- Teste 4: resolver chamado -> chat vira histórico read-only ---');
  const pEncerrado = esperarEvento(socketUsuario, 'chat_encerrado');
  await axios.patch(
    `${API_URL}/chamados/${chamado.id}/status`,
    { status: 'RESOLVIDO' },
    { headers: { Authorization: `Bearer ${tokenTecnico}` } }
  );
  try {
    const evt = await pEncerrado;
    log('Usuário recebeu chat_encerrado', true, `encerradoPorResolucao=${evt.encerradoPorResolucao}`);
  } catch (e) {
    log('Usuário recebeu chat_encerrado', false, e.message);
  }

  // ── Teste 5: histórico acessível via API mesmo encerrado ──
  console.log('\n--- Teste 5: GET /chamados/:id/chat ainda retorna a sessão encerrada ---');
  const { data: chatData } = await axios.get(`${API_URL}/chamados/${chamado.id}/chat`, {
    headers: { Authorization: `Bearer ${tokenUsuario}` },
  });
  log('Sessão retornada após encerrada', !!chatData.sessao, JSON.stringify(chatData.sessao));

  console.log('\n--- Teste 6: entrar_chat numa sessão ENCERRADA retorna somenteLeitura ---');
  const pHistorico = esperarEvento(socketUsuario, 'historico_chat');
  socketUsuario.emit('entrar_chat', { sessaoId });
  try {
    const hist = await pHistorico;
    log('somenteLeitura = true', hist.somenteLeitura === true, JSON.stringify(hist));
  } catch (e) {
    log('historico_chat recebido', false, e.message);
  }

  console.log('\nFim dos testes.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro no script:', err.response?.data || err.message);
  process.exit(1);
});
