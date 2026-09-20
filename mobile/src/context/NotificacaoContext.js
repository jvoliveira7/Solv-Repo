import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socketService';
import { navigate } from '../navigation/navigationRef';
import { obterTokenPush, salvarTokenNoBackend, ACAO, emExpoGo } from '../services/notificacaoService';

// ── Notificações push (P6) ─────────────────────────────────────────────
// O backend já decide QUANDO mandar (só notifica quem não está com o app
// conectado / com a conversa aberta), então aqui é só: registrar o token,
// reagir ao toque e executar os botões de ação.
//
// No Expo Go, expo-notifications não pode nem ser importado (ver o require
// condicional em notificacaoService.js) — então tudo aqui usa esse mesmo
// `Notifications` (null no Expo Go) e vira no-op nesse caso.
const Notifications = emExpoGo ? null : require('expo-notifications');

const CHAVE_PREFERENCIA = '@solv:notificacoes_ativas';

if (!emExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const NotificacaoContext = createContext(null);

export function NotificacaoProvider({ children }) {
  const { usuario } = useAuth();
  const [ativas, setAtivas] = useState(true);
  const [token, setToken] = useState(null);
  const respostaTratadaRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_PREFERENCIA).then((valor) => {
      if (valor !== null) setAtivas(valor === 'true');
    });
  }, []);

  // Registra (ou limpa) o token sempre que muda o usuário logado ou a
  // preferência do switch em Ajustes.
  useEffect(() => {
    if (!usuario?.id) {
      setToken(null);
      return;
    }

    let cancelado = false;

    (async () => {
      if (!ativas) {
        setToken(null);
        await salvarTokenNoBackend(null).catch(() => {});
        return;
      }

      const novoToken = await obterTokenPush({ avisarSeNegado: false });
      if (cancelado || !novoToken) return;

      setToken(novoToken);
      await salvarTokenNoBackend(novoToken).catch((err) => {
        console.warn('Não foi possível salvar o token de push:', err?.message || err);
      });
    })();

    return () => { cancelado = true; };
  }, [usuario?.id, ativas]);

  // ── Ações dos botões / toque ────────────────────────────────────────
  async function tratarResposta(resposta) {
    if (!resposta) return;

    // O cold start entrega a mesma resposta de novo pelo listener; o id da
    // notificação evita executar a ação duas vezes.
    const idResposta = resposta.notification?.request?.identifier;
    if (idResposta && respostaTratadaRef.current === idResposta) return;
    respostaTratadaRef.current = idResposta;

    const dados = resposta.notification?.request?.content?.data || {};
    const acao = resposta.actionIdentifier;

    try {
      if (acao === ACAO.RECUSAR_CHAT) {
        await api.post(`/chat/${dados.sessaoId}/recusar`);
        return;
      }

      if (acao === ACAO.ASSUMIR_CHAMADO) {
        await api.patch(`/chamados/${dados.chamadoId}/status`, { status: 'EM_ATENDIMENTO' });
        return;
      }

      if (acao === ACAO.RESPONDER) {
        const texto = resposta.userText?.trim();
        if (texto) await api.post(`/chat/${dados.sessaoId}/mensagens`, { texto });
        return;
      }

      if (acao === ACAO.ACEITAR_CHAT) {
        // Aceitar continua passando pelo socket (mesmo fluxo do Alert in-app);
        // o app já está abrindo por causa do opensAppToForeground.
        getSocket()?.emit('aceitar_chat', { sessaoId: dados.sessaoId });
        abrirTela(dados);
        return;
      }

      // Toque simples na notificação → só navega
      abrirTela(dados);
    } catch (err) {
      console.warn('Erro ao tratar ação da notificação:', err?.response?.data?.erro || err?.message || err);
    }
  }

  function abrirTela(dados) {
    if (dados.tipo === 'CHAMADO_URGENTE') {
      navigate('PainelTab', {
        screen: 'DetalheChamadoTecnico',
        params: { id: dados.chamadoId },
      });
      return;
    }

    if (!dados.sessaoId) return;

    // `Chat` existe em várias stacks — navegar pela aba de Chats evita
    // depender de qual stack está ativa no momento.
    navigate('ChatsTab', {
      screen: 'Chat',
      params: {
        sessaoId: dados.sessaoId,
        chamadoTitulo: dados.chamadoTitulo,
        contato: dados.contato,
        isTecnico: !!dados.isTecnico,
      },
    });
  }

  useEffect(() => {
    if (!usuario?.id || emExpoGo) return;

    const inscricao = Notifications.addNotificationResponseReceivedListener(tratarResposta);

    // App aberto a partir de uma notificação com ele fechado
    Notifications.getLastNotificationResponseAsync().then(tratarResposta);

    return () => inscricao.remove();
  }, [usuario?.id]);

  async function alternarNotificacoes(valor) {
    setAtivas(valor);
    await AsyncStorage.setItem(CHAVE_PREFERENCIA, String(valor));
  }

  return (
    <NotificacaoContext.Provider value={{ ativas, token, alternarNotificacoes }}>
      {children}
    </NotificacaoContext.Provider>
  );
}

export function useNotificacoes() {
  const ctx = useContext(NotificacaoContext);
  if (!ctx) throw new Error('useNotificacoes precisa estar dentro de NotificacaoProvider');
  return ctx;
}
