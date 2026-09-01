import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cores, espaco, raio, statusCor, statusLabel, prioridadeCor } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';

const FILTROS = ['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO'];
const FILTRO_STATUS = {
  ABERTO: 'ABERTO',
  EM_ATENDIMENTO: 'EM_ATENDIMENTO,AGUARDANDO',
  RESOLVIDO: 'RESOLVIDO,FECHADO',
};
const FILTRO_LABEL = { ABERTO: 'Abertos', EM_ATENDIMENTO: 'Em andamento', RESOLVIDO: 'Resolvidos' };

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function PainelTecnicoScreen({ navigation }) {
  const { usuario, logout } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState('ABERTO');

  async function carregarChamados() {
    try {
      const { data } = await api.get('/chamados', { params: { status: FILTRO_STATUS[filtro] } });
      const ordem = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
      data.sort((a, b) => (ordem[a.prioridade] ?? 4) - (ordem[b.prioridade] ?? 4));
      setChamados(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os chamados.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarChamados(); }, [filtro]));

  function renderChamado({ item }) {
    const chatDisponivel = item.chat?.status === 'ATIVA' || item.chat?.status === 'PENDENTE';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetalheChamadoTecnico', { id: item.id })}
      >
        <View style={styles.cardTopo}>
          <View style={[styles.faixaPrioridade, { backgroundColor: prioridadeCor[item.prioridade] }]} />
          <View style={styles.cardConteudo}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitulo} numberOfLines={2}>{item.titulo}</Text>
              <View style={[styles.badge, { backgroundColor: prioridadeCor[item.prioridade] + '22' }]}>
                <Text style={[styles.badgeTexto, { color: prioridadeCor[item.prioridade] }]}>
                  {item.prioridade}
                </Text>
              </View>
            </View>

            <View style={styles.solicitanteLinha}>
              <View style={styles.avatarPequeno}>
                <Text style={styles.avatarPequenoTexto}>{iniciais(item.solicitante.nome)}</Text>
              </View>
              <Text style={styles.cardInfo}>{item.solicitante.nome} · {tempoRelativo(item.criadoEm)}</Text>
            </View>

            <View style={styles.cardRodape}>
              <View style={[styles.badge, { backgroundColor: statusCor[item.status] + '22' }]}>
                <Text style={[styles.badgeTexto, { color: statusCor[item.status] }]}>
                  {statusLabel[item.status]}
                </Text>
              </View>
              {chatDisponivel && (
                <Text style={styles.chatDisponivel}>💬 Chat disponível</Text>
              )}
              {item._count.comentarios > 0 && (
                <Text style={styles.cardComentarios}>📝 {item._count.comentarios}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Sair da conta?', '', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: logout },
          ])}
          style={styles.avatarGrande}
        >
          <Text style={styles.avatarGrandeTexto}>{iniciais(usuario?.nome)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.abas}>
        {FILTROS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.aba, filtro === item && styles.abaAtiva]}
            onPress={() => setFiltro(item)}
          >
            <Text style={[styles.abaTexto, filtro === item && styles.abaTextoAtiva]}>
              {FILTRO_LABEL[item]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando
        ? <ActivityIndicator size="large" color={cores.azul} style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={chamados}
            keyExtractor={(item) => item.id}
            renderItem={renderChamado}
            contentContainerStyle={chamados.length === 0 ? styles.listaVazia : styles.lista}
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={() => { setAtualizando(true); carregarChamados(); }}
                tintColor={cores.azul}
              />
            }
            ListEmptyComponent={
              <Text style={styles.vazioTexto}>Nenhum chamado nesse filtro.</Text>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: espaco.xl, paddingTop: 16, paddingBottom: 12,
  },
  logo: { color: cores.texto, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  avatarGrande: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: cores.roxo,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarGrandeTexto: { color: '#fff', fontSize: 13, fontWeight: '700' },

  abas: { flexDirection: 'row', paddingHorizontal: espaco.lg, gap: 8, marginBottom: 8 },
  aba: {
    flex: 1, paddingVertical: 10, borderRadius: raio.md, alignItems: 'center',
    backgroundColor: cores.card, borderWidth: 1, borderColor: cores.cardBorda,
  },
  abaAtiva: { backgroundColor: cores.azulSuave, borderColor: cores.azul },
  abaTexto: { color: cores.textoSecundario, fontSize: 12, fontWeight: '600' },
  abaTextoAtiva: { color: cores.azulClaro },

  lista: { padding: espaco.lg, paddingTop: 4 },
  card: {
    backgroundColor: cores.card, borderRadius: raio.lg,
    marginBottom: 12, borderWidth: 1, borderColor: cores.cardBorda, overflow: 'hidden',
  },
  cardTopo: { flexDirection: 'row' },
  faixaPrioridade: { width: 4 },
  cardConteudo: { flex: 1, padding: espaco.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  cardTitulo: { color: cores.texto, fontSize: 15, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: raio.sm, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 10, fontWeight: '700' },

  solicitanteLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  avatarPequeno: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: cores.cardBorda,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPequenoTexto: { color: cores.textoSecundario, fontSize: 9, fontWeight: '700' },
  cardInfo: { color: cores.textoSecundario, fontSize: 12 },

  cardRodape: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatDisponivel: { color: cores.azulClaro, fontSize: 12, fontWeight: '600' },
  cardComentarios: { color: cores.textoTerciario, fontSize: 12 },

  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: cores.textoTerciario, fontSize: 15 },
});
