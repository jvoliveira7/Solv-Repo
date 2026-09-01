import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import api from '../../services/api';
import { cores, espaco, raio, comum } from '../../theme';

const CATEGORIAS = [
  { valor: 'HARDWARE', label: 'Hardware', icone: '🖥️' },
  { valor: 'SOFTWARE', label: 'Software', icone: '💾' },
  { valor: 'REDE', label: 'Rede', icone: '📶' },
  { valor: 'ACESSO', label: 'Acesso', icone: '🔑' },
  { valor: 'IMPRESSORA', label: 'Impressora', icone: '🖨️' },
  { valor: 'OUTRO', label: 'Outro', icone: '⋯' },
];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

const PRIORIDADE_COR = {
  BAIXA: cores.sucesso,
  MEDIA: cores.aviso,
  ALTA: cores.erro,
  CRITICA: cores.roxo,
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
      const mensagem = err.response?.data?.erro || err.message || 'Erro ao abrir chamado.';
      Alert.alert('Erro', mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <TouchableOpacity style={styles.bannerGuiado} onPress={() => navigation.navigate('GuidedTab', { screen: 'GuidedMode' })}>
        <Text style={styles.bannerGuiadoIcone}>✨</Text>
        <Text style={styles.bannerGuiadoTexto}>Prefere ser guiado passo a passo?</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Título do problema</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Impressora não imprime"
        placeholderTextColor={cores.placeholder}
        value={titulo}
        onChangeText={setTitulo}
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, styles.inputMultilinha]}
        placeholder="Descreva o que está acontecendo"
        placeholderTextColor={cores.placeholder}
        multiline
        numberOfLines={4}
        value={descricao}
        onChangeText={setDescricao}
      />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.gradeCategorias}>
        {CATEGORIAS.map((cat) => {
          const selecionada = categoria === cat.valor;
          return (
            <TouchableOpacity
              key={cat.valor}
              style={[styles.cardCategoria, selecionada && styles.cardCategoriaSelecionada]}
              onPress={() => setCategoria(cat.valor)}
            >
              <Text style={styles.cardCategoriaIcone}>{cat.icone}</Text>
              <Text style={[styles.cardCategoriaTexto, selecionada && styles.cardCategoriaTextoSelecionado]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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

      <Text style={styles.label}>Localização (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="📍 Ex: Sala 12, 2º andar"
        placeholderTextColor={cores.placeholder}
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
          : <Text style={styles.botaoTexto}>Enviar chamado</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  content: { padding: espaco.xl, paddingBottom: 40 },

  bannerGuiado: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: cores.azulSuave, borderWidth: 1, borderColor: cores.azul,
    borderRadius: raio.md, paddingVertical: 13, marginBottom: espaco.xl,
  },
  bannerGuiadoIcone: { fontSize: 15 },
  bannerGuiadoTexto: { color: cores.azulClaro, fontSize: 14, fontWeight: '600' },

  label: {
    color: cores.textoSecundario, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 18,
  },
  input: { ...comum.input },
  inputMultilinha: { height: 100, textAlignVertical: 'top' },

  gradeCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardCategoria: {
    width: '31%', backgroundColor: cores.card, borderWidth: 1, borderColor: cores.cardBorda,
    borderRadius: raio.md, paddingVertical: 16, alignItems: 'center', gap: 6,
  },
  cardCategoriaSelecionada: { backgroundColor: cores.azulSuave, borderColor: cores.azul },
  cardCategoriaIcone: { fontSize: 22 },
  cardCategoriaTexto: { color: cores.textoSecundario, fontSize: 12, fontWeight: '600' },
  cardCategoriaTextoSelecionado: { color: cores.azulClaro },

  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: raio.sm,
    borderWidth: 1, borderColor: cores.cardBorda, backgroundColor: cores.card,
  },
  opcaoTexto: { color: cores.textoSecundario, fontSize: 13, fontWeight: '500' },

  botao: { ...comum.botaoPrimario, marginTop: 32 },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { ...comum.botaoPrimarioTexto, fontSize: 16 },
});
