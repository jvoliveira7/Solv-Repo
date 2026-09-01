import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../../services/api';
import { useChatSessao } from '../../hooks/useChatSessao';

const STATUS_COR = {
  ABERTO: '#2d6fff', EM_ATENDIMENTO: '#f59e0b',
  AGUARDANDO: '#8b5cf6', RESOLVIDO: '#10b981', FECHADO: '#6b7280',
};
const STATUS_LABEL = {
  ABERTO: 'Aberto', EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO: 'Aguardando', RESOLVIDO: 'Resolvido', FECHADO: 'Fechado',
};
const PROXIMOS_STATUS = {
  ABERTO: ['EM_ATENDIMENTO'],
  EM_ATENDIMENTO: ['AGUARDANDO', 'RESOLVIDO'],
  AGUARDANDO: ['EM_ATENDIMENTO', 'RESOLVIDO'],
  RESOLVIDO: ['FECHADO'],
  FECHADO: [],
};

export default function DetalheChamadoTecnicoScreen({ route, navigation }) {
  const { id } = route.params;
  const [chamado, setChamado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [anotacao, setAnotacao] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const { sessao: sessaoChat, convidar, aceitar, recusar } = useChatSessao(id);

  async function carregarChamado() {
    try {
      const { data } = await api.get(`/chamados/${id}`);
      setChamado(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o chamado.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarChamado();
    const unsubscribe = navigation.addListener('focus', carregarChamado);
    return unsubscribe;
  }, []);

  function handleAceitarConvite() {
    aceitar();
    navigation.navigate('Chat', {
      sessaoId: sessaoChat.id,
      chamadoTitulo: chamado.titulo,
      contato: chamado.solicitante,
      isTecnico: true,
    });
  }

  async function handleAtualizarStatus(novoStatus) {
    setAtualizando(true);
    try {
      await api.patch(`/chamados/${id}/status`, {
        status: novoStatus,
        anotacao: anotacao.trim() || undefined,
      });
      setAnotacao('');
      carregarChamado();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Erro ao atualizar status.');
    } finally {
      setAtualizando(false);
    }
  }

  function confirmarStatus(novoStatus) {
    Alert.alert(
      `Mover para "${STATUS_LABEL[novoStatus]}"?`,
      anotacao ? `Anotação: "${anotacao}"` : 'Sem anotação.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => handleAtualizarStatus(novoStatus) },
      ]
    );
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2d6fff" />
      </View>
    );
  }

  if (!chamado) return null;

  const proximosStatus = PROXIMOS_STATUS[chamado.status] || [];
  const chatAtivo = sessaoChat?.status === 'ATIVA';
  const chatPendente = sessaoChat?.status === 'PENDENTE';
  const chatHistorico = sessaoChat?.status === 'ENCERRADA';
  const podeConvidarChat = !sessaoChat || chatHistorico;
  // PENDENTE pode ter sido criada pelo técnico (aguardando o usuário) OU
  // pelo usuário (o técnico é quem precisa responder).
  const convitePendenteRecebido = chatPendente && sessaoChat.iniciadoPor === 'USUARIO';
  const convitePendenteEnviado = chatPendente && sessaoChat.iniciadoPor === 'TECNICO';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>

        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_COR[chamado.status] + '22' }]}>
          <Text style={[styles.statusTexto, { color: STATUS_COR[chamado.status] }]}>
            {STATUS_LABEL[chamado.status]}
          </Text>
        </View>

        {/* Info */}
        <Text style={styles.titulo}>{chamado.titulo}</Text>
        <Text style={styles.meta}>Solicitante: {chamado.solicitante.nome} · {chamado.solicitante.setor}</Text>
        <Text style={styles.meta}>{chamado.categoria} · {chamado.prioridade}</Text>
        {chamado.localizacao && <Text style={styles.meta}>📍 {chamado.localizacao}</Text>}
        <Text style={styles.meta}>Aberto em {new Date(chamado.criadoEm).toLocaleDateString('pt-BR')}</Text>

        {/* Chat: ativo, aguardando, histórico, ou disponível pra convidar */}
        {chatAtivo && (
          <TouchableOpacity
            style={styles.botaoChat}
            onPress={() => navigation.navigate('Chat', {
              sessaoId: sessaoChat.id,
              chamadoTitulo: chamado.titulo,
              contato: chamado.solicitante,
              isTecnico: true,
            })}
          >
            <Text style={styles.botaoChatTexto}>💬 Chat ativo — Abrir conversa</Text>
          </TouchableOpacity>
        )}

        {convitePendenteRecebido && (
          <View style={styles.conviteBox}>
            <Text style={styles.convitePergunta}>
              💬 {chamado.solicitante.nome} quer conversar sobre este chamado.
            </Text>
            <View style={styles.conviteBotoes}>
              <TouchableOpacity style={[styles.botaoConvite, styles.botaoRecusar]} onPress={recusar}>
                <Text style={styles.botaoConviteTexto}>Recusar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoConvite, styles.botaoAceitar]} onPress={handleAceitarConvite}>
                <Text style={styles.botaoConviteTexto}>Aceitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {convitePendenteEnviado && (
          <View style={[styles.botaoChat, styles.botaoChatPendente]}>
            <Text style={[styles.botaoChatTexto, { color: '#f59e0b' }]}>Aguardando resposta do usuário...</Text>
          </View>
        )}

        {chatHistorico && (
          <TouchableOpacity
            style={[styles.botaoChat, styles.botaoChatHistorico]}
            onPress={() => navigation.navigate('Chat', {
              sessaoId: sessaoChat.id,
              chamadoTitulo: chamado.titulo,
              contato: chamado.solicitante,
              isTecnico: true,
            })}
          >
            <Text style={[styles.botaoChatTexto, { color: '#888' }]}>📄 Ver histórico do chat</Text>
          </TouchableOpacity>
        )}

        {podeConvidarChat && chamado.status !== 'FECHADO' && (
          <TouchableOpacity
            style={[styles.botaoChat, styles.botaoChatConvidar]}
            onPress={convidar}
          >
            <Text style={styles.botaoChatTexto}>💬 Convidar usuário para chat</Text>
          </TouchableOpacity>
        )}

        <View style={styles.separador} />

        {/* Descrição */}
        <Text style={styles.secaoTitulo}>Descrição</Text>
        <Text style={styles.descricao}>{chamado.descricao}</Text>

        <View style={styles.separador} />

        {/* Histórico */}
        <Text style={styles.secaoTitulo}>Histórico ({chamado.comentarios.length})</Text>
        {chamado.comentarios.length === 0 && (
          <Text style={styles.vazioTexto}>Nenhuma anotação ainda.</Text>
        )}
        {chamado.comentarios.map((c) => (
          <View key={c.id} style={styles.comentario}>
            <Text style={styles.comentarioAutor}>{c.autor.nome}
              <Text style={styles.comentarioPerfil}> · {c.autor.perfil}</Text>
            </Text>
            <Text style={styles.comentarioTexto}>{c.texto}</Text>
            <Text style={styles.comentarioData}>{new Date(c.criadoEm).toLocaleString('pt-BR')}</Text>
          </View>
        ))}

        {/* Ações */}
        {proximosStatus.length > 0 && (
          <>
            <View style={styles.separador} />
            <Text style={styles.secaoTitulo}>Anotação (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Registre o que foi feito ou observado..."
              placeholderTextColor="#555"
              multiline
              value={anotacao}
              onChangeText={setAnotacao}
            />
            <Text style={styles.secaoTitulo}>Mover para</Text>
            <View style={styles.acoesRow}>
              {proximosStatus.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.botaoAcao, { borderColor: STATUS_COR[status], backgroundColor: STATUS_COR[status] + '22' }]}
                  onPress={() => confirmarStatus(status)}
                  disabled={atualizando}
                >
                  {atualizando
                    ? <ActivityIndicator color={STATUS_COR[status]} size="small" />
                    : <Text style={[styles.botaoAcaoTexto, { color: STATUS_COR[status] }]}>
                        {STATUS_LABEL[status]}
                      </Text>
                  }
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 40 },
  statusBanner: { borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 16 },
  statusTexto: { fontWeight: 'bold', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  meta: { color: '#888', fontSize: 13, marginBottom: 4 },
  separador: { height: 1, backgroundColor: '#2a2d3a', marginVertical: 20 },
  secaoTitulo: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  descricao: { color: '#ccc', fontSize: 15, lineHeight: 22 },
  vazioTexto: { color: '#555', fontSize: 14 },
  botaoChat: {
    backgroundColor: '#2d6fff22', borderWidth: 1, borderColor: '#2d6fff',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  botaoChatTexto: { color: '#2d6fff', fontSize: 15, fontWeight: '600' },
  botaoChatPendente: { backgroundColor: '#1a1d27', borderColor: '#f59e0b' },
  botaoChatHistorico: { backgroundColor: '#1a1d27', borderColor: '#2a2d3a' },
  botaoChatConvidar: { backgroundColor: '#1a1d27', borderColor: '#2d6fff', marginTop: 10 },
  conviteBox: { marginTop: 16 },
  convitePergunta: { color: '#fff', fontSize: 14, marginBottom: 10 },
  conviteBotoes: { flexDirection: 'row', gap: 10 },
  botaoConvite: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botaoRecusar: { backgroundColor: '#1a1d27', borderWidth: 1, borderColor: '#ef4444' },
  botaoAceitar: { backgroundColor: '#2d6fff' },
  botaoConviteTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
  comentario: {
    backgroundColor: '#1a1d27', borderRadius: 10, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2d3a',
  },
  comentarioAutor: { color: '#fff', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  comentarioPerfil: { color: '#888', fontWeight: '400' },
  comentarioTexto: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  comentarioData: { color: '#555', fontSize: 11, marginTop: 6 },
  input: {
    backgroundColor: '#1a1d27', borderWidth: 1, borderColor: '#2a2d3a',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: '#fff', fontSize: 15, marginBottom: 16,
  },
  acoesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  botaoAcao: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, alignItems: 'center',
  },
  botaoAcaoTexto: { fontWeight: 'bold', fontSize: 14 },
});
