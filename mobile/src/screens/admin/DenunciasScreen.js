import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Switch,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { cores, espaco, raio, comum, fontInter } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';
import { MOTIVOS_DENUNCIA } from '../../components/DenunciaModal';
import Avatar from '../../components/Avatar';

const FILTROS = [
  { valor: 'PENDENTE', label: 'Pendentes' },
  { valor: 'PROCEDENTE', label: 'Procedentes' },
  { valor: 'IMPROCEDENTE', label: 'Improcedentes' },
  { valor: null, label: 'Todas' },
];

const STATUS = {
  PENDENTE: { label: 'Pendente', cor: cores.aviso },
  PROCEDENTE: { label: 'Procedente', cor: cores.erro },
  IMPROCEDENTE: { label: 'Improcedente', cor: cores.textoTerciario },
};

const rotuloMotivo = (valor) => MOTIVOS_DENUNCIA.find((m) => m.valor === valor)?.label || valor;

export default function DenunciasScreen() {
  const insets = useSafeAreaInsets();
  const [denuncias, setDenuncias] = useState([]);
  const [filtro, setFiltro] = useState('PENDENTE');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [resposta, setResposta] = useState('');
  const [suspender, setSuspender] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const params = filtro ? { status: filtro } : {};
      const { data } = await api.get('/admin/denuncias', { params });
      setDenuncias(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as denúncias.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [filtro]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function abrir(denuncia) {
    setSelecionada(denuncia);
    setResposta('');
    setSuspender(false);
  }

  async function julgar(status) {
    setSalvando(true);
    try {
      await api.patch(`/admin/denuncias/${selecionada.id}`, {
        status,
        respostaAdmin: resposta.trim() || undefined,
        suspenderDenunciado: status === 'PROCEDENTE' ? suspender : false,
      });
      setSelecionada(null);
      await carregar();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível julgar a denúncia.');
    } finally {
      setSalvando(false);
    }
  }

  const pendente = selecionada?.status === 'PENDENTE';

  return (
    <View style={styles.container}>
      <View style={styles.filtros}>
        {FILTROS.map((f) => {
          const ativo = filtro === f.valor;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filtro, ativo && styles.filtroAtivo]}
              onPress={() => { setCarregando(true); setFiltro(f.valor); }}
            >
              <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {carregando ? (
        <View style={styles.centro}><ActivityIndicator size="large" color={cores.azul} /></View>
      ) : (
        <FlatList
          data={denuncias}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => { setAtualizando(true); carregar(); }}
              tintColor={cores.azulClaro}
            />
          }
          ListEmptyComponent={<Text style={styles.vazio}>Nenhuma denúncia por aqui. 🎉</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => abrir(item)} activeOpacity={0.75}>
              <View style={styles.cardTopo}>
                <Avatar uri={item.denunciado.avatar} nome={item.denunciado.nome} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome} numberOfLines={1}>{item.denunciado.nome}</Text>
                  <Text style={styles.sub}>{rotuloMotivo(item.motivo)} · {tempoRelativo(item.criadoEm)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: STATUS[item.status].cor + '22' }]}>
                  <Text style={[styles.badgeTexto, { color: STATUS[item.status].cor }]}>{STATUS[item.status].label}</Text>
                </View>
              </View>
              <Text style={styles.descricao} numberOfLines={3}>{item.descricao}</Text>
              <Text style={styles.rodape} numberOfLines={1}>
                Por {item.denunciante.nome} · chamado “{item.chamado.titulo}”
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selecionada} transparent animationType="slide" onRequestClose={() => setSelecionada(null)}>
        <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {selecionada && (
            <View style={[styles.modalCaixa, { paddingBottom: insets.bottom + espaco.lg }]}>
              <Text style={styles.modalTitulo}>Denúncia contra {selecionada.denunciado.nome}</Text>
              <Text style={styles.sub}>
                {rotuloMotivo(selecionada.motivo)} · por {selecionada.denunciante.nome} · {tempoRelativo(selecionada.criadoEm)}
              </Text>

              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Relato</Text>
                <View style={styles.relato}>
                  <Text style={styles.relatoTexto}>{selecionada.descricao}</Text>
                </View>
                <Text style={styles.rodape}>Chamado: {selecionada.chamado.titulo}</Text>

                {pendente ? (
                  <>
                    <Text style={styles.label}>Resposta (o denunciante vê no chamado)</Text>
                    <TextInput
                      style={[comum.input, { minHeight: 70, backgroundColor: cores.fundo }]}
                      placeholder="Explique a decisão (opcional)"
                      placeholderTextColor={cores.placeholder}
                      value={resposta}
                      onChangeText={setResposta}
                      multiline
                      textAlignVertical="top"
                    />

                    <View style={styles.switchLinha}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchTitulo}>Suspender o técnico</Text>
                        <Text style={styles.switchSub}>Só vale se a denúncia for procedente.</Text>
                      </View>
                      <Switch
                        value={suspender}
                        onValueChange={setSuspender}
                        trackColor={{ true: cores.erro, false: cores.cardBorda }}
                        thumbColor="#fff"
                      />
                    </View>

                    <View style={styles.botoesLinha}>
                      <TouchableOpacity
                        style={[styles.botao, styles.botaoNeutro, salvando && { opacity: 0.6 }]}
                        onPress={() => julgar('IMPROCEDENTE')}
                        disabled={salvando}
                      >
                        <Text style={styles.botaoNeutroTexto}>Improcedente</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.botao, { backgroundColor: cores.erro }, salvando && { opacity: 0.6 }]}
                        onPress={() => julgar('PROCEDENTE')}
                        disabled={salvando}
                      >
                        {salvando
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.botaoTexto}>Procedente</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Decisão</Text>
                    <View style={[styles.badge, { alignSelf: 'flex-start', backgroundColor: STATUS[selecionada.status].cor + '22' }]}>
                      <Text style={[styles.badgeTexto, { color: STATUS[selecionada.status].cor }]}>
                        {STATUS[selecionada.status].label}
                      </Text>
                    </View>
                    {selecionada.respostaAdmin ? (
                      <Text style={[styles.relatoTexto, { marginTop: 10 }]}>{selecionada.respostaAdmin}</Text>
                    ) : null}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.fechar} onPress={() => setSelecionada(null)}>
                <Text style={styles.fecharTexto}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazio: { color: cores.textoTerciario, fontSize: 14, textAlign: 'center', marginTop: 32 },

  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: espaco.lg, paddingBottom: espaco.sm },
  filtro: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: raio.pill,
    borderWidth: 1, borderColor: cores.cardBorda, backgroundColor: cores.card,
  },
  filtroAtivo: { borderColor: cores.azul, backgroundColor: cores.azulSuave },
  filtroTexto: { color: cores.textoSecundario, fontSize: 13, fontFamily: fontInter.semibold },
  filtroTextoAtivo: { color: cores.azulClaro },

  lista: { padding: espaco.lg, paddingTop: espaco.sm, paddingBottom: 32, gap: 10 },
  card: { ...comum.card, padding: espaco.md },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nome: { color: cores.texto, fontSize: 15, fontFamily: fontInter.bold },
  sub: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: raio.sm },
  badgeTexto: { fontSize: 11, fontFamily: fontInter.bold },
  descricao: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 10 },
  rodape: { color: cores.textoTerciario, fontSize: 12, marginTop: 10 },

  modalFundo: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCaixa: {
    backgroundColor: cores.card, borderTopLeftRadius: raio.xl, borderTopRightRadius: raio.xl,
    padding: espaco.xl,
  },
  modalTitulo: { color: cores.texto, fontSize: 17, fontFamily: fontInter.extrabold },
  label: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 18,
  },
  relato: { backgroundColor: cores.fundo, borderRadius: raio.md, padding: espaco.md },
  relatoTexto: { color: cores.texto, fontSize: 14, lineHeight: 21 },

  switchLinha: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  switchTitulo: { color: cores.texto, fontSize: 14, fontFamily: fontInter.semibold },
  switchSub: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },

  botoesLinha: { flexDirection: 'row', gap: 10, marginTop: 18 },
  botao: { ...comum.botaoPrimario, flex: 1 },
  botaoTexto: { ...comum.botaoPrimarioTexto },
  botaoNeutro: { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.cardBorda },
  botaoNeutroTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.bold },
  fechar: { alignItems: 'center', paddingVertical: 14, marginTop: espaco.sm },
  fecharTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.semibold },
});
