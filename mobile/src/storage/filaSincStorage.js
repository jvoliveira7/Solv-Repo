import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIXO = '@solv:fila_sync:';

function gerarIdLocal() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function obterFila(usuarioId) {
  const json = await AsyncStorage.getItem(PREFIXO + usuarioId);
  return json ? JSON.parse(json) : [];
}

async function salvarFila(usuarioId, fila) {
  await AsyncStorage.setItem(PREFIXO + usuarioId, JSON.stringify(fila));
  return fila;
}

// Adiciona um chamado pendente à fila do usuário e devolve a fila inteira
// já atualizada (pra quem chamou poder recarregar o estado em memória).
export async function adicionarNaFila(usuarioId, payload) {
  const fila = await obterFila(usuarioId);
  const item = { idLocal: gerarIdLocal(), payload, criadoEm: new Date().toISOString(), tentativas: 0, erroPermanente: null };
  return salvarFila(usuarioId, [...fila, item]);
}

export async function removerDaFila(usuarioId, idLocal) {
  const fila = await obterFila(usuarioId);
  return salvarFila(usuarioId, fila.filter((item) => item.idLocal !== idLocal));
}

export async function atualizarItemNaFila(usuarioId, idLocal, mudancas) {
  const fila = await obterFila(usuarioId);
  return salvarFila(usuarioId, fila.map((item) => (item.idLocal === idLocal ? { ...item, ...mudancas } : item)));
}
