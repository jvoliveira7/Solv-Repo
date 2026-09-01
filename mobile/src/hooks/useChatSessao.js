import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useChatStore } from '../context/ChatContext';

// Interface única pras telas de detalhe de chamado interagirem com o
// chat. Substitui o padrão antigo de state local + listener duplicado
// por tela — tudo vem da store central do ChatContext.
export function useChatSessao(chamadoId) {
  const { state, buscarSessao, emit, registrarTelaAtiva, desregistrarTelaAtiva } = useChatStore();
  const sessao = state.sessions[chamadoId] || null;

  useEffect(() => {
    if (chamadoId && !sessao?.carregado) buscarSessao(chamadoId);
  }, [chamadoId]);

  // Enquanto a tela deste chamado está em foco, o ChatContext global não
  // dispara Alert pra eventos deste chamadoId — a UI inline já reage.
  useFocusEffect(
    useCallback(() => {
      registrarTelaAtiva(chamadoId);
      return () => desregistrarTelaAtiva();
    }, [chamadoId])
  );

  return {
    sessao,
    carregando: sessao?.carregando ?? true,
    recarregar: () => buscarSessao(chamadoId),
    solicitar: () => emit('solicitar_chat', { chamadoId }),
    convidar: () => emit('convidar_chat', { chamadoId }),
    aceitar: () => sessao?.id && emit('aceitar_chat', { sessaoId: sessao.id }),
    recusar: () => sessao?.id && emit('recusar_chat', { sessaoId: sessao.id }),
  };
}
