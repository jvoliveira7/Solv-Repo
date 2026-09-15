import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';

// Precisam bater com os IDs usados em backend/src/services/pushService.js
export const CATEGORIA = {
  SOLICITACAO_CHAT: 'chat_solicitacao',
  CHAMADO_URGENTE: 'chamado_urgente',
  NOVA_MENSAGEM: 'nova_mensagem',
};

export const ACAO = {
  ACEITAR_CHAT: 'aceitar_chat',
  RECUSAR_CHAT: 'recusar_chat',
  ASSUMIR_CHAMADO: 'assumir_chamado',
  RESPONDER: 'responder',
};

const CANAL = { CHAT: 'chat', CHAMADOS: 'chamados' };

// Canais do Android definem som/importância/vibração e aparecem nas
// configurações do sistema — o usuário pode desligar um sem desligar tudo.
async function configurarCanaisAndroid() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CANAL.CHAT, {
    name: 'Mensagens e chats',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2d6fff',
  });

  await Notifications.setNotificationChannelAsync(CANAL.CHAMADOS, {
    name: 'Chamados urgentes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#ef4444',
  });
}

// Botões que aparecem na própria notificação. `opensAppToForeground: false`
// resolve em background, sem abrir o app — é o que dá o "interativo".
//
// LIMITAÇÃO CONHECIDA (testada e confirmada em 2026-09-15): esses botões só
// aparecem de fato quando o push chega como mensagem "data-only" (sem
// title/body/sound no nível raiz da mensagem — hoje pushService.js manda
// esses campos no nível raiz, então o Android trata como "notification
// message" padrão do sistema e ignora o categoryId por completo). Com app
// fechado, além disso, precisaria de uma background task via
// expo-task-manager (Notifications.registerTaskAsync) pra montar a
// notificação manualmente na chegada. Ver discussão da equipe do Expo:
// https://github.com/expo/expo/issues/31503#issuecomment-2451100154
// Hoje o toque simples na notificação (deep link) funciona normalmente —
// só os botões inline com app fechado ficam pendentes dessa mudança maior.
async function registrarCategorias() {
  await Notifications.setNotificationCategoryAsync(CATEGORIA.SOLICITACAO_CHAT, [
    {
      identifier: ACAO.ACEITAR_CHAT,
      buttonTitle: 'Aceitar',
      // Aceitar leva direto pra conversa, então abrir o app é o que se espera
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACAO.RECUSAR_CHAT,
      buttonTitle: 'Recusar',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(CATEGORIA.CHAMADO_URGENTE, [
    {
      identifier: ACAO.ASSUMIR_CHAMADO,
      buttonTitle: 'Assumir',
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(CATEGORIA.NOVA_MENSAGEM, [
    {
      identifier: ACAO.RESPONDER,
      buttonTitle: 'Responder',
      textInput: { submitButtonTitle: 'Enviar', placeholder: 'Escreva sua resposta...' },
      options: { opensAppToForeground: false },
    },
  ]);
}

function obterProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    null
  );
}

// Pede permissão no mesmo padrão do app (checa granted, Alert em primeira
// pessoa, return silencioso) e devolve o token do Expo — ou null se não deu.
export async function obterTokenPush({ avisarSeNegado = true } = {}) {
  if (!Device.isDevice) {
    console.warn('Push só funciona em aparelho físico.');
    return null;
  }

  const atual = await Notifications.getPermissionsAsync();
  let status = atual.status;

  if (status !== 'granted') {
    const pedido = await Notifications.requestPermissionsAsync();
    status = pedido.status;
  }

  if (status !== 'granted') {
    if (avisarSeNegado) {
      Alert.alert(
        'Permissão necessária',
        'Preciso da permissão de notificações pra te avisar de mensagens e chamados novos.'
      );
    }
    return null;
  }

  const projectId = obterProjectId();
  if (!projectId || projectId === 'PREENCHER_COM_EAS_INIT') {
    console.warn('projectId do EAS não configurado — rode `eas init` e preencha o app.json.');
    return null;
  }

  try {
    await configurarCanaisAndroid();
    await registrarCategorias();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('Não foi possível obter o token de push:', err?.message || err);
    return null;
  }
}

// Guarda (ou limpa, mandando null) o token no backend
export async function salvarTokenNoBackend(pushToken) {
  await api.patch('/auth/push-token', { pushToken: pushToken || null });
}
