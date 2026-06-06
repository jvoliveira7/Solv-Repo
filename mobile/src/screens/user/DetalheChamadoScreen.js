import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../../services/api';

const STATUS_COR = {
  ABERTO: '#2d6fff', EM_ATENDIMENTO: '#f59e0b',
  AGUARDANDO: '#8b5cf6', RESOLVIDO: '#10b981', FECHADO: '#6b7280',
};
const STATUS_LABEL = {
  ABERTO: 'Aberto', EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO: 'Aguardando', RESOLVIDO: 'Resolvido', FECHADO: 'Fechado',
};

export default function DetalheChamadoScreen({ route }) {
  const { id } = route.params;
  const [chamado, setChamado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

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

  useEffect(() => { carregarChamado(); }, []);

  async function handleComentario() {
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/chamados/${id}/comentarios`, { texto: comentario });
      setComentario('');
      carregarChamado();
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o comentário.');
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2d6fff" />
      </View>
    );
  }

  if (!chamado) return null;

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
        <Text style={styles.meta}>{chamado.categoria} · {chamado.prioridade}</Text>
        {chamado.localizacao && <Text style={styles.meta}>📍 {chamado.localizacao}</Text>}
        <Text style={styles.meta}>Aberto em {new Date(chamado.criadoEm).toLocaleDateString('pt-BR')}</Text>

        {chamado.tecnico && (
          <Text style={styles.meta}>🔧 Técnico: {chamado.tecnico.nome}</Text>
        )}

        <View style={styles.separador} />

        {/* Descrição */}
        <Text style={styles.secaoTitulo}>Descrição</Text>
        <Text style={styles.descricao}>{chamado.descricao}</Text>

        <View style={styles.separador} />

        {/* Comentários */}
        <Text style={styles.secaoTitulo}>Histórico ({chamado.comentarios.length})</Text>
        {chamado.comentarios.length === 0 && (
          <Text style={styles.vazioTexto}>Nenhum comentário ainda.</Text>
        )}
        {chamado.comentarios.map((c) => (
          <View key={c.id} style={styles.comentario}>
            <Text style={styles.comentarioAutor}>{c.autor.nome}
              <Text style={styles.comentarioPerfil}> · {c.autor.perfil}</Text>
            </Text>
            <Text style={styles.comentarioTexto}>{c.texto}</Text>
            <Text style={styles.comentarioData}>
              {new Date(c.criadoEm).toLocaleString('pt-BR')}
            </Text>
          </View>
        ))}

      </ScrollView>

      {/* Input de comentário */}
      {chamado.status !== 'FECHADO' && (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.inputComentario}
            placeholder="Adicionar comentário..."
            placeholderTextColor="#555"
            value={comentario}
            onChangeText={setComentario}
          />
          <TouchableOpacity
            style={[styles.botaoEnviar, enviando && { opacity: 0.6 }]}
            onPress={handleComentario}
            disabled={enviando}
          >
            {enviando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.botaoEnviarTexto}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 16 },
  statusBanner: { borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 16 },
  statusTexto: { fontWeight: 'bold', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  meta: { color: '#888', fontSize: 13, marginBottom: 4 },
  separador: { height: 1, backgroundColor: '#2a2d3a', marginVertical: 20 },
  secaoTitulo: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  descricao: { color: '#ccc', fontSize: 15, lineHeight: 22 },
  vazioTexto: { color: '#555', fontSize: 14 },
  comentario: {
    backgroundColor: '#1a1d27', borderRadius: 10, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2d3a',
  },
  comentarioAutor: { color: '#fff', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  comentarioPerfil: { color: '#888', fontWeight: '400' },
  comentarioTexto: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  comentarioData: { color: '#555', fontSize: 11, marginTop: 6 },
  inputArea: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1,
    borderTopColor: '#2a2d3a', backgroundColor: '#0f1117', gap: 8,
  },
  inputComentario: {
    flex: 1, backgroundColor: '#1a1d27', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#2a2d3a',
  },
  botaoEnviar: {
    backgroundColor: '#2d6fff', borderRadius: 10,
    width: 44, justifyContent: 'center', alignItems: 'center',
  },
  botaoEnviarTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
