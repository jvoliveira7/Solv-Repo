import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../../services/api';
import { conectarSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

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
  const { usuario } = useAuth();
  const [chamado, setChamado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [anotacao, setAnotacao] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [sessaoChat, setSessaoChat] = useState(null);
  const socketRef = useRef(null);

  async function carregarChamado() {
    try {
      const { data } = await api.get(`/chamados/${id}`);
      setChamado(data);
      const { data: chatData } = await api.get(`/chamados/${id}/chat`);
      setSessaoChat(chatData.sessao);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o chamado.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarChamado();
    configurarSocket();

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.off('solicitacao_chat');
      }
    };
  }, []);

  async function configurarSocket() {
    const socket = await conectarSocket();
    socketRef.current = socket;

    // Recebe solicitação de chat do usuário
    socket.on('solicitacao_chat', ({ sessaoId, chamadoId, chamadoTitulo, solicitante }) => {
      if (chamadoId !== id) return;

      Alert.alert(
        '💬 Solicitação de Chat',
        `${solicitante.nome} quer conversar sobre o chamado "${chamadoTitulo}".`,
        [
          {
            text: 'Recusar',
            style: 'destructive',
            onPress: () => {
              socket.emit('recusar_chat', { sessaoId });
              setSessaoChat(null);
            },
          },
          {
            text: 'Aceitar',
            onPress: () => {
              socket.emit('aceitar_chat', { sessaoId });
              setSessaoChat({ id: sessaoId, status: 'ATIVA' });
              navigation.navigate('Chat', {
                sessaoId,
                chamadoTitulo,
                contato: solicitante,
                isTecnico: true,
              });
            },
          },
        ]
      );
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

        {/* Botão de chat ativo */}
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
