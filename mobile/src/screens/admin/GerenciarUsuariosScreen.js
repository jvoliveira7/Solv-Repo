import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cores, espaco, raio, comum, fontInter } from '../../theme';
import Avatar from '../../components/Avatar';

const FILTROS = [
  { valor: null, label: 'Todos' },
  { valor: 'USUARIO', label: 'Usuários' },
  { valor: 'TECNICO', label: 'Técnicos' },
  { valor: 'ADMIN', label: 'Admins' },
];

const PERFIL_LABEL = { USUARIO: 'Usuário', TECNICO: 'Técnico', ADMIN: 'Admin' };
const PERFIL_COR = { USUARIO: cores.textoSecundario, TECNICO: cores.azulClaro, ADMIN: cores.roxo };
const PERFIL_DESCRICAO = {
  USUARIO: 'Abre chamados e conversa com técnicos.',
  TECNICO: 'Atende chamados, participa de times e do chat da equipe.',
  ADMIN: 'Tudo do técnico + painel administrativo, denúncias, usuários e times.',
};

export default function GerenciarUsuariosScreen() {
  const insets = useSafeAreaInsets();
  const { usuario: eu } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const params = {};
      if (busca.trim()) params.busca = busca.trim();
      if (filtro) params.perfil = filtro;
      const { data } = await api.get('/admin/usuarios', { params });
      setUsuarios(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os usuários.');
    } finally {
      setCarregando(false);
    }
  }, [busca, filtro]);

  // pequeno atraso na busca pra não disparar uma requisição por letra digitada
  useEffect(() => {
    const espera = setTimeout(carregar, 350);
    return () => clearTimeout(espera);
  }, [carregar]);

  function abrir(usuario) {
    setSelecionado(usuario);
    setMotivo('');
  }

  function aplicarAtualizacao(atualizado) {
    setUsuarios((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u)));
    setSelecionado(atualizado);
  }

  function confirmarPerfil(novoPerfil) {
    if (novoPerfil === selecionado.perfil) return;
    Alert.alert(
      'Alterar função?',
      `${selecionado.nome} passa de ${PERFIL_LABEL[selecionado.perfil]} para ${PERFIL_LABEL[novoPerfil]}.`
        + (novoPerfil === 'USUARIO' ? ' Ele sai do time atual.' : ''),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSalvando(true);
            try {
              const { data } = await api.patch(`/admin/usuarios/${selecionado.id}/perfil`, { perfil: novoPerfil });
              aplicarAtualizacao(data);
            } catch (err) {
              Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível alterar a função.');
            } finally {
              setSalvando(false);
            }
          },
        },
      ]
    );
  }

  async function alterarSuspensao(suspender) {
    setSalvando(true);
    try {
      const { data } = await api.patch(`/admin/usuarios/${selecionado.id}/suspensao`, {
        suspenso: suspender,
        motivo: suspender ? motivo.trim() || undefined : undefined,
      });
      aplicarAtualizacao(data);
      setMotivo('');
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível alterar a suspensão.');
    } finally {
      setSalvando(false);
    }
  }

  function confirmarSuspensao() {
    Alert.alert(
      'Suspender conta?',
      `${selecionado.nome} perde o acesso na hora. Se for técnico, os chamados em atendimento voltam pra fila.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Suspender', style: 'destructive', onPress: () => alterarSuspensao(true) },
      ]
    );
  }

  const ehEu = selecionado?.id === eu?.id;

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <View style={styles.buscaLinha}>
          <Ionicons name="search" size={16} color={cores.textoTerciario} />
          <TextInput
            style={styles.buscaInput}
            placeholder="Buscar por nome ou e-mail"
            placeholderTextColor={cores.placeholder}
            value={busca}
            onChangeText={setBusca}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.filtros}>
          {FILTROS.map((f) => {
            const ativo = filtro === f.valor;
            return (
              <TouchableOpacity
                key={f.label}
                style={[styles.filtro, ativo && styles.filtroAtivo]}
                onPress={() => setFiltro(f.valor)}
              >
                <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {carregando ? (
        <View style={styles.centro}><ActivityIndicator size="large" color={cores.azul} /></View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum usuário encontrado.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.linha} onPress={() => abrir(item)} activeOpacity={0.75}>
              <Avatar uri={item.avatar} nome={item.nome} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nome} numberOfLines={1}>{item.nome}</Text>
                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                <View style={styles.tags}>
                  <View style={[styles.tag, { backgroundColor: PERFIL_COR[item.perfil] + '22' }]}>
                    <Text style={[styles.tagTexto, { color: PERFIL_COR[item.perfil] }]}>{PERFIL_LABEL[item.perfil]}</Text>
                  </View>
                  {item.time && (
                    <View style={[styles.tag, { backgroundColor: cores.cardBorda }]}>
                      <Text style={[styles.tagTexto, { color: cores.textoSecundario }]}>{item.time.nome}</Text>
                    </View>
                  )}
                  {item.suspenso && (
                    <View style={[styles.tag, { backgroundColor: cores.erroSuave }]}>
                      <Text style={[styles.tagTexto, { color: cores.erro }]}>Suspenso</Text>
                    </View>
                  )}
                  {item._count?.denunciasRecebidas > 0 && (
                    <View style={[styles.tag, { backgroundColor: cores.avisoSuave }]}>
                      <Text style={[styles.tagTexto, { color: cores.aviso }]}>
                        {item._count.denunciasRecebidas} denúncia(s) procedente(s)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={cores.textoTerciario} />
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selecionado} transparent animationType="slide" onRequestClose={() => setSelecionado(null)}>
        <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {selecionado && (
            <View style={[styles.modalCaixa, { paddingBottom: insets.bottom + espaco.lg }]}>
              <View style={styles.modalCabecalho}>
                <Avatar uri={selecionado.avatar} nome={selecionado.nome} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalNome} numberOfLines={1}>{selecionado.nome}</Text>
                  <Text style={styles.email} numberOfLines={1}>{selecionado.email}</Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
                {ehEu ? (
                  <Text style={styles.aviso}>Esta é a sua conta — não dá pra alterar a própria função nem se suspender.</Text>
                ) : (
                  <>
                    <Text style={styles.label}>Função</Text>
                    {['USUARIO', 'TECNICO', 'ADMIN'].map((p) => {
                      const ativo = selecionado.perfil === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.opcao, ativo && styles.opcaoAtiva]}
                          onPress={() => confirmarPerfil(p)}
                          disabled={salvando}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.opcaoTitulo, ativo && { color: cores.azulClaro }]}>{PERFIL_LABEL[p]}</Text>
                            <Text style={styles.opcaoDescricao}>{PERFIL_DESCRICAO[p]}</Text>
                          </View>
                          {ativo && <Ionicons name="checkmark-circle" size={20} color={cores.azulClaro} />}
                        </TouchableOpacity>
                      );
                    })}

                    <Text style={styles.label}>Restrição</Text>
                    {selecionado.suspenso ? (
                      <>
                        <Text style={styles.aviso}>
                          Conta suspensa{selecionado.motivoSuspensao ? `: ${selecionado.motivoSuspensao}` : '.'}
                        </Text>
                        <TouchableOpacity
                          style={[styles.botao, { backgroundColor: cores.sucesso }, salvando && { opacity: 0.6 }]}
                          onPress={() => alterarSuspensao(false)}
                          disabled={salvando}
                        >
                          <Text style={styles.botaoTexto}>Reativar conta</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TextInput
                          style={[comum.input, { backgroundColor: cores.fundo }]}
                          placeholder="Motivo da suspensão (opcional)"
                          placeholderTextColor={cores.placeholder}
                          value={motivo}
                          onChangeText={setMotivo}
                        />
                        <TouchableOpacity
                          style={[styles.botao, { backgroundColor: cores.erro }, salvando && { opacity: 0.6 }]}
                          onPress={confirmarSuspensao}
                          disabled={salvando}
                        >
                          <Text style={styles.botaoTexto}>Suspender conta</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.fechar} onPress={() => setSelecionado(null)}>
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

  topo: { padding: espaco.lg, paddingBottom: espaco.sm, gap: 10 },
  buscaLinha: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.card,
    borderRadius: raio.md, borderWidth: 1, borderColor: cores.cardBorda, paddingHorizontal: 14,
  },
  buscaInput: { flex: 1, paddingVertical: 11, color: cores.texto, fontSize: 15 },
  filtros: { flexDirection: 'row', gap: 8 },
  filtro: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: raio.pill,
    borderWidth: 1, borderColor: cores.cardBorda, backgroundColor: cores.card,
  },
  filtroAtivo: { borderColor: cores.azul, backgroundColor: cores.azulSuave },
  filtroTexto: { color: cores.textoSecundario, fontSize: 13, fontFamily: fontInter.semibold },
  filtroTextoAtivo: { color: cores.azulClaro },

  lista: { padding: espaco.lg, paddingTop: espaco.sm, paddingBottom: 32, gap: 10 },
  linha: { ...comum.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: espaco.md },
  nome: { color: cores.texto, fontSize: 15, fontFamily: fontInter.bold },
  email: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { borderRadius: raio.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tagTexto: { fontSize: 11, fontFamily: fontInter.semibold },

  modalFundo: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCaixa: {
    backgroundColor: cores.card, borderTopLeftRadius: raio.xl, borderTopRightRadius: raio.xl,
    padding: espaco.xl,
  },
  modalCabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalNome: { color: cores.texto, fontSize: 17, fontFamily: fontInter.extrabold },
  label: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 18,
  },
  aviso: { color: cores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 16, marginBottom: 6 },
  opcao: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: cores.cardBorda,
    borderRadius: raio.md, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 8, backgroundColor: cores.fundo,
  },
  opcaoAtiva: { borderColor: cores.azul, backgroundColor: cores.azulSuave },
  opcaoTitulo: { color: cores.texto, fontSize: 14, fontFamily: fontInter.semibold },
  opcaoDescricao: { color: cores.textoTerciario, fontSize: 12, marginTop: 2 },
  botao: { ...comum.botaoPrimario, marginTop: 10 },
  botaoTexto: { ...comum.botaoPrimarioTexto },
  fechar: { alignItems: 'center', paddingVertical: 14, marginTop: espaco.sm },
  fecharTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.semibold },
});
