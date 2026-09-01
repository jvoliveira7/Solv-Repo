import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { conectarSocket, desconectarSocket } from '../services/socketService';
import { navigate } from '../navigation/navigationRef';
import api from '../services/api';

// ── Store central do chat ───────────────────────────────────────────
// Estado: sessions[chamadoId] = { id, status, iniciadoPor, mensagens,
//         somenteLeitura, encerradoPorResolucao, carregado, carregando }
// Toda tela lê e escreve por aqui via useChatSessao() — nunca listener
// ou state duplicado por tela.

const initialState = { sessions: {} };

function reducer(state, action) {
  const s = state.sessions[action.chamadoId] || {};
  switch (action.type) {
    case 'SESSAO_CARREGANDO':
      return { sessions: { ...state.sessions, [action.chamadoId]: { ...s, carregando: true } } };
    case 'SESSAO_ATUALIZADA':
      return {
        sessions: {
          ...state.sessions,
          [action.chamadoId]: {
            ...s,
            ...action.sessao,
            carregado: true,
            carregando: false,
          },
        },
      };
    case 'MENSAGENS_CARREGADAS':
      return {
        sessions: {
          ...state.sessions,
          [action.chamadoId]: {
            ...s,
            mensagens: action.mensagens,
            somenteLeitura: action.somenteLeitura,
            encerradoPorResolucao: action.encerradoPorResolucao,
          },
        },
      };
    case 'NOVA_MENSAGEM':
      return {
        sessions: {
          ...state.sessions,
          [action.chamadoId]: {
            ...s,
            mensagens: [...(s.mensagens || []), action.mensagem],
          },
        },
      };
    case 'CHAT_ENCERRADO':
      return {
        sessions: {
          ...state.sessions,
          [action.chamadoId]: {
            ...s,
            status: 'ENCERRADA',
            somenteLeitura: true,
            encerradoPorResolucao: action.encerradoPorResolucao,
          },
        },
      };
    default:
      return state;
  }
}

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { usuario } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);
  // Qual chamadoId está com a tela de detalhe aberta agora — usado pra
  // não duplicar o Alert quando a própria tela já mostra a UI inline.
  const telaAtivaRef = useRef(null);

  useEffect(() => {
    if (!usuario) {
      desconectarSocket();
      socketRef.current = null;
      return;
    }

    let mounted = true;

    (async () => {
      const socket = await conectarSocket();
      if (!mounted) return;
      socketRef.current = socket;

      const alertaSeNaoEstiverNaTela = (chamadoId, mostrarAlerta) => {
        if (telaAtivaRef.current !== chamadoId) mostrarAlerta();
      };

      socket.on('convite_chat', ({ sessaoId, chamadoId, chamadoTitulo, tecnico }) => {
        dispatch({ type: 'SESSAO_ATUALIZADA', chamadoId, sessao: { id: sessaoId, status: 'PENDENTE', iniciadoPor: 'TECNICO' } });
        alertaSeNaoEstiverNaTela(chamadoId, () => {
          Alert.alert('💬 Convite de Chat', `${tecnico.nome} (TI) quer abrir um chat sobre "${chamadoTitulo}".`, [
            { text: 'Recusar', style: 'destructive', onPress: () => socket.emit('recusar_chat', { sessaoId }) },
            {
              text: 'Aceitar',
              onPress: () => {
                socket.emit('aceitar_chat', { sessaoId });
                navigate('Chat', { sessaoId, chamadoTitulo, contato: tecnico, isTecnico: false });
              },
            },
          ]);
        });
      });

      socket.on('solicitacao_chat', ({ sessaoId, chamadoId, chamadoTitulo, solicitante }) => {
        dispatch({ type: 'SESSAO_ATUALIZADA', chamadoId, sessao: { id: sessaoId, status: 'PENDENTE', iniciadoPor: 'USUARIO' } });
        alertaSeNaoEstiverNaTela(chamadoId, () => {
          Alert.alert('💬 Solicitação de Chat', `${solicitante.nome} quer conversar sobre "${chamadoTitulo}".`, [
            { text: 'Recusar', style: 'destructive', onPress: () => socket.emit('recusar_chat', { sessaoId }) },
            {
              text: 'Aceitar',
              onPress: () => {
                socket.emit('aceitar_chat', { sessaoId });
                navigate('Chat', { sessaoId, chamadoTitulo, contato: solicitante, isTecnico: true });
              },
            },
          ]);
        });
      });

      socket.on('chat_aceito', ({ sessaoId, chamadoId, contato }) => {
        dispatch({ type: 'SESSAO_ATUALIZADA', chamadoId, sessao: { id: sessaoId, status: 'ATIVA' } });
        alertaSeNaoEstiverNaTela(chamadoId, () => {
          Alert.alert('✅ Chat aceito!', `${contato.nome} aceitou o chat.`, [
            { text: 'Abrir Chat', onPress: () => navigate('Chat', { sessaoId, contato }) },
          ]);
        });
      });

      socket.on('chat_recusado', ({ chamadoId }) => {
        if (chamadoId) dispatch({ type: 'SESSAO_ATUALIZADA', chamadoId, sessao: { status: null } });
        alertaSeNaoEstiverNaTela(chamadoId, () => {
          Alert.alert('Chat recusado', 'A outra pessoa não aceitou o chat no momento.');
        });
      });

      socket.on('chat_encerrado', ({ sessaoId, chamadoId, encerradoPorResolucao }) => {
        if (chamadoId) dispatch({ type: 'CHAT_ENCERRADO', chamadoId, encerradoPorResolucao });
      });

      socket.on('nova_mensagem', (mensagem) => {
        dispatch({ type: 'NOVA_MENSAGEM', chamadoId: mensagem.chamadoId, mensagem });
      });
    })();

    return () => {
      mounted = false;
      const socket = socketRef.current;
      if (socket) {
        ['convite_chat', 'solicitacao_chat', 'chat_aceito', 'chat_recusado', 'chat_encerrado', 'nova_mensagem'].forEach((e) => socket.off(e));
      }
    };
  }, [usuario?.id]);

  async function buscarSessao(chamadoId) {
    dispatch({ type: 'SESSAO_CARREGANDO', chamadoId });
    try {
      const { data } = await api.get(`/chamados/${chamadoId}/chat`);
      dispatch({ type: 'SESSAO_ATUALIZADA', chamadoId, sessao: data.sessao || { status: null } });
    } catch {
      dispatch({ type: 'SESSAO_ATUALIZADA', chamadoId, sessao: { status: null } });
    }
  }

  function emit(evento, payload) {
    socketRef.current?.emit(evento, payload);
  }

  function registrarTelaAtiva(chamadoId) {
    telaAtivaRef.current = chamadoId;
  }
  function desregistrarTelaAtiva() {
    telaAtivaRef.current = null;
  }

  return (
    <ChatContext.Provider value={{ state, dispatch, buscarSessao, emit, registrarTelaAtiva, desregistrarTelaAtiva }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatStore precisa estar dentro de ChatProvider');
  return ctx;
}
