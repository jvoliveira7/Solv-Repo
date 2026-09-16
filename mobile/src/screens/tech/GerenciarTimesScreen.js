import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { cores, espaco, raio, comum, fontInter } from '../../theme';

const CATEGORIAS = [
  { valor: 'HARDWARE', label: 'Hardware', icone: '🖥️' },
  { valor: 'SOFTWARE', label: 'Software', icone: '💾' },
  { valor: 'REDE', label: 'Rede', icone: '📶' },
  { valor: 'ACESSO', label: 'Acesso', icone: '🔑' },
  { valor: 'IMPRESSORA', label: 'Impressora', icone: '🖨️' },
  { valor: 'OUTRO', label: 'Outro', icone: '⋯' },
];

export default function GerenciarTimesScreen() {
  const insets = useSafeAreaInsets();
  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/times');
      setTimes(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os times.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function abrirModal() {
    setNome('');
    setCategorias([]);
    setAdminId(null);
    try {
      const { data } = await api.get('/times/tecnicos-disponiveis');
      setTecnicos(data);
    } catch {
      setTecnicos([]);
    }
    setModalAberto(true);
  }

  function alternarCategoria(valor) {
    setCategorias((prev) => (prev.includes(valor) ? prev.filter((c) => c !== valor) : [...prev, valor]));
  }

  async function criarTime() {
    if (!nome.trim()) return Alert.alert('Atenção', 'Dê um nome ao time.');
    if (categorias.length === 0) return Alert.alert('Atenção', 'Escolha ao menos uma categoria.');

    setSalvando(true);
    try {
      await api.post('/times', { nome, categorias, adminId: adminId || undefined });
      setModalAberto(false);
      carregar();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível criar o time.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={times}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardNome}>{item.nome}</Text>
            <View style={styles.chipsLinha}>
              {item.categorias.map((c) => {
                const meta = CATEGORIAS.find((x) => x.valor === c);
                return (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipTexto}>{meta?.icone} {meta?.label || c}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.cardMembros}>
              {item._count?.membros ?? 0} técnico(s)
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum time criado ainda.</Text>
        }
      />

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={abrirModal}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.fabTexto}>Novo time</Text>
      </TouchableOpacity>

      <Modal visible={modalAberto} transparent animationType="slide" onRequestClose={() => setModalAberto(false)}>
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { paddingBottom: insets.bottom + espaco.lg }]}>
            <Text style={styles.modalTitulo}>Novo time</Text>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={comum.input}
                placeholder="Ex: Suporte Impressoras"
                placeholderTextColor={cores.placeholder}
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Categorias que o time atende</Text>
              <View style={styles.gradeCategorias}>
                {CATEGORIAS.map((cat) => {
                  const ativa = categorias.includes(cat.valor);
                  return (
                    <TouchableOpacity
                      key={cat.valor}
                      style={[styles.cardCategoria, ativa && styles.cardCategoriaAtiva]}
                      onPress={() => alternarCategoria(cat.valor)}
                    >
                      <Text style={styles.categoriaIcone}>{cat.icone}</Text>
                      <Text style={[styles.categoriaTexto, ativa && styles.categoriaTextoAtiva]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Admin do time (opcional)</Text>
              {tecnicos.length === 0 ? (
                <Text style={styles.vazio}>Nenhum técnico cadastrado.</Text>
              ) : (
                tecnicos.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.linhaTecnico, adminId === t.id && styles.linhaTecnicoAtiva]}
                    onPress={() => setAdminId(adminId === t.id ? null : t.id)}
                  >
                    <Text style={[styles.tecnicoNome, adminId === t.id && { color: cores.azulClaro }]}>{t.nome}</Text>
                    {adminId === t.id && <Ionicons name="checkmark-circle" size={18} color={cores.azulClaro} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.botaoCriar, salvando && { opacity: 0.6 }]}
              onPress={criarTime}
              disabled={salvando}
            >
              {salvando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.botaoCriarTexto}>Criar time</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalFechar} onPress={() => setModalAberto(false)}>
              <Text style={styles.modalFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo },
  lista: { padding: espaco.lg, paddingBottom: 100 },
  vazio: { color: cores.textoTerciario, fontSize: 14, textAlign: 'center', marginTop: 24 },

  card: { ...comum.card, marginBottom: 12 },
  cardNome: { color: cores.texto, fontSize: 16, fontFamily: fontInter.bold },
  chipsLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: cores.azulSuave, borderRadius: raio.sm, paddingHorizontal: 8, paddingVertical: 4 },
  chipTexto: { color: cores.azulClaro, fontSize: 11, fontFamily: fontInter.semibold },
  cardMembros: { color: cores.textoTerciario, fontSize: 12, marginTop: 10 },

  fab: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row',
    backgroundColor: cores.azul, borderRadius: raio.md, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  fabTexto: { color: '#fff', fontSize: 15, fontFamily: fontInter.bold },

  modalFundo: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCaixa: {
    backgroundColor: cores.card, borderTopLeftRadius: raio.xl, borderTopRightRadius: raio.xl,
    padding: espaco.xl,
  },
  modalTitulo: { color: cores.texto, fontSize: 18, fontFamily: fontInter.extrabold, marginBottom: espaco.lg },
  label: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },

  gradeCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardCategoria: {
    width: '31%', backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.cardBorda,
    borderRadius: raio.md, paddingVertical: 12, alignItems: 'center', gap: 4,
  },
  cardCategoriaAtiva: { backgroundColor: cores.azulSuave, borderColor: cores.azul },
  categoriaIcone: { fontSize: 18 },
  categoriaTexto: { color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.semibold },
  categoriaTextoAtiva: { color: cores.azulClaro },

  linhaTecnico: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: raio.sm,
    borderWidth: 1, borderColor: cores.cardBorda, marginBottom: 6,
  },
  linhaTecnicoAtiva: { borderColor: cores.azul, backgroundColor: cores.azulSuave },
  tecnicoNome: { color: cores.texto, fontSize: 14 },

  botaoCriar: { ...comum.botaoPrimario, marginTop: espaco.xl },
  botaoCriarTexto: { ...comum.botaoPrimarioTexto },
  modalFechar: { alignItems: 'center', paddingVertical: 12 },
  modalFecharTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.semibold },
});
