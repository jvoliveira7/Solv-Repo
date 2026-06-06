import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import api from '../../services/api';

const CATEGORIAS = ['HARDWARE', 'SOFTWARE', 'REDE', 'ACESSO', 'IMPRESSORA', 'OUTRO'];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

const PRIORIDADE_COR = {
  BAIXA: '#10b981',
  MEDIA: '#f59e0b',
  ALTA: '#ef4444',
  CRITICA: '#7c3aed',
};

export default function NovoChamadoScreen({ navigation }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [prioridade, setPrioridade] = useState('MEDIA');
  const [localizacao, setLocalizacao] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleEnviar() {
    if (!titulo || !descricao || !categoria) {
      Alert.alert('Atenção', 'Preencha título, descrição e categoria.');
      return;
    }

    setCarregando(true);
    try {
      await api.post('/chamados', { titulo, descricao, categoria, prioridade, localizacao });
      Alert.alert('Sucesso', 'Chamado aberto com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const mensagem = err.response?.data?.erro || 'Erro ao abrir chamado.';
      Alert.alert('Erro', mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.label}>Título *</Text>
      <TextInput
        style={styles.input}
        placeholder="Descreva o problema brevemente"
        placeholderTextColor="#555"
        value={titulo}
        onChangeText={setTitulo}
      />

      <Text style={styles.label}>Descrição *</Text>
      <TextInput
        style={[styles.input, styles.inputMultilinha]}
        placeholder="Detalhe o que está acontecendo..."
        placeholderTextColor="#555"
        multiline
        numberOfLines={4}
        value={descricao}
        onChangeText={setDescricao}
      />

      <Text style={styles.label}>Categoria *</Text>
      <View style={styles.opcoes}>
        {CATEGORIAS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.opcao, categoria === cat && styles.opcaoSelecionada]}
            onPress={() => setCategoria(cat)}
          >
            <Text style={[styles.opcaoTexto, categoria === cat && styles.opcaoTextoSelecionado]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Prioridade</Text>
      <View style={styles.opcoes}>
        {PRIORIDADES.map((pri) => (
          <TouchableOpacity
            key={pri}
            style={[
              styles.opcao,
              prioridade === pri && { backgroundColor: PRIORIDADE_COR[pri] + '22', borderColor: PRIORIDADE_COR[pri] },
            ]}
            onPress={() => setPrioridade(pri)}
          >
            <Text style={[
              styles.opcaoTexto,
              prioridade === pri && { color: PRIORIDADE_COR[pri] },
            ]}>
              {pri}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Localização</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Secretaria de Educação, Sala 3"
        placeholderTextColor="#555"
        value={localizacao}
        onChangeText={setLocalizacao}
      />

      <TouchableOpacity
        style={[styles.botao, carregando && styles.botaoDesabilitado]}
        onPress={handleEnviar}
        disabled={carregando}
      >
        {carregando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.botaoTexto}>Abrir Chamado</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 40 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1a1d27', borderWidth: 1, borderColor: '#2a2d3a',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 15,
  },
  inputMultilinha: { height: 100, textAlignVertical: 'top' },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#2a2d3a', backgroundColor: '#1a1d27',
  },
  opcaoSelecionada: { backgroundColor: '#2d6fff22', borderColor: '#2d6fff' },
  opcaoTexto: { color: '#888', fontSize: 13, fontWeight: '500' },
  opcaoTextoSelecionado: { color: '#2d6fff' },
  botao: {
    backgroundColor: '#2d6fff', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
