import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { obterFila, adicionarNaFila, removerDaFila, atualizarItemNaFila } from '../storage/filaSincStorage';

// ── Store de sincronização (modo offline parcial) ──────────────────────
// `estaOnline` vem do NetInfo; `pendentes` é a fila de chamados criados
// offline, persistida em AsyncStorage e escopada por usuário. Sincroniza
// sozinha ao reconectar e ao carregar a fila já online (abrir o app).

const initialState = { estaOnline: null, pendentes: [], carregado: false };

function reducer(state, action) {
  switch (action.type) {
    case 'CONECTIVIDADE_MUDOU':
      return { ...state, estaOnline: action.estaOnline };
    case 'FILA_ATUALIZADA':
      return { ...state, pendentes: action.fila, carregado: true };
    default:
      return state;
  }
}

const SincronizacaoContext = createContext(null);

export function SincronizacaoProvider({ children }) {
  const { usuario } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const sincronizandoRef = useRef(false);

  useEffect(() => {
    if (!usuario?.id) {
      dispatch({ type: 'FILA_ATUALIZADA', fila: [] });
      return;
    }
    obterFila(usuario.id).then((fila) => dispatch({ type: 'FILA_ATUALIZADA', fila }));
  }, [usuario?.id]);

  useEffect(() => {
    function aoMudarConectividade(estadoRede) {
      dispatch({
        type: 'CONECTIVIDADE_MUDOU',
        estaOnline: !!estadoRede.isConnected && estadoRede.isInternetReachable !== false,
      });
    }
    NetInfo.fetch().then(aoMudarConectividade);
    return NetInfo.addEventListener(aoMudarConectividade);
  }, []);

  async function sincronizar() {
    if (sincronizandoRef.current || !usuario?.id) return;
    sincronizandoRef.current = true;
    try {
      let fila = await obterFila(usuario.id);
      for (const item of fila) {
        if (item.erroPermanente) continue;
        try {
          await api.post('/chamados', item.payload);
          fila = await removerDaFila(usuario.id, item.idLocal);
        } catch (err) {
          if (err.response) {
            // erro real do servidor (ex.: validação) — repetir sozinho não resolve
            fila = await atualizarItemNaFila(usuario.id, item.idLocal, {
              tentativas: item.tentativas + 1,
              erroPermanente: err.response.data?.erro || 'Não foi possível enviar este chamado.',
            });
          } else {
            // falha de rede — mantém na fila, provavelmente caiu a conexão de novo
            fila = await atualizarItemNaFila(usuario.id, item.idLocal, { tentativas: item.tentativas + 1 });
            break;
          }
        }
      }
      dispatch({ type: 'FILA_ATUALIZADA', fila });
    } finally {
      sincronizandoRef.current = false;
    }
  }

  // Dispara sozinha ao reconectar (ou ao abrir o app já online com a fila
  // carregada) — não depende de pendentes.length pra não repetir a cada
  // item adicionado/removido, só quando a conectividade/carga mudam.
  useEffect(() => {
    if (state.estaOnline === true && state.carregado && state.pendentes.length > 0) {
      sincronizar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.estaOnline, state.carregado]);

  // Tenta enviar na hora; se a falha for de rede (ou já estiver offline),
  // enfileira em vez de propagar erro — quem chamou recebe { pendente }.
  async function criarChamado(dados) {
    if (state.estaOnline) {
      try {
        const { data } = await api.post('/chamados', dados);
        return { pendente: false, chamado: data };
      } catch (err) {
        if (err.response) throw err;
        // sem response = falha de rede mesmo "online" (ex.: NetInfo atrasado) — enfileira abaixo
      }
    }

    const fila = await adicionarNaFila(usuario.id, dados);
    dispatch({ type: 'FILA_ATUALIZADA', fila });
    return { pendente: true };
  }

  return (
    <SincronizacaoContext.Provider value={{ ...state, criarChamado, sincronizar }}>
      {children}
    </SincronizacaoContext.Provider>
  );
}

export function useSincronizacao() {
  const ctx = useContext(SincronizacaoContext);
  if (!ctx) throw new Error('useSincronizacao precisa estar dentro de SincronizacaoProvider');
  return ctx;
}
