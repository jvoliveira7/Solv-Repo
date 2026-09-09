import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cores, espaco, raio, statusCor, statusLabel, prioridadeCor, fontInter } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';

const FILTROS = ['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO'];
const FILTRO_STATUS = {
  ABERTO: 'ABERTO',
  EM_ATENDIMENTO: 'EM_ATENDIMENTO,AGUARDANDO',
  RESOLVIDO: 'RESOLVIDO,FECHADO',
};
const FILTRO_LABEL = { ABERTO: 'Abertos', EM_ATENDIMENTO: 'Em andamento', RESOLVIDO: 'Resolvidos' };
const ORDEM_PRIORIDADE = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

// RN10: prioriza chamados sem técnico atribuído, depois por nível de
// prioridade (Urgente/Crítica → Baixa), depois por ordem cronológica
// (mais antigo primeiro, como uma fila de verdade).
function ordenarFila(chamados) {
  return [...chamados].sort((a, b) => {
    const semTecnicoA = a.tecnicoId ? 1 : 0;
    const semTecnicoB = b.tecnicoId ? 1 : 0;
    if (semTecnicoA !== semTecnicoB) return semTecnicoA - semTecnicoB;

    const prioA = ORDEM_PRIORIDADE[a.prioridade] ?? 4;
    const prioB = ORDEM_PRIORIDADE[b.prioridade] ?? 4;
    if (prioA !== prioB) return prioA - prioB;

    return new Date(a.criadoEm) - new Date(b.criadoEm);
  });
}

export default function PainelTecnicoScreen({ navigation }) {
  const { usuario, logout } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [contagens, setContagens] = useState({ ABERTO: 0, EM_ATENDIMENTO: 0, RESOLVIDO: 0 });
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState('ABERTO');

  async function carregarTudo() {
    try {
      const [chamadosResp, contagensResp] = await Promise.all([
        api.get('/chamados', { params: { status: FILTRO_STATUS[filtro] } }),
        api.get('/chamados/contagem'),
      ]);
      setChamados(ordenarFila(chamadosResp.data));
      setContagens(contagensResp.data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os chamados.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarTudo(); }, [filtro]));

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
              {!item.tecnicoId && (
                <View style={styles.tagSemTecnico}>
                  <Text style={styles.tagSemTecnicoTexto}>Sem técnico</Text>
                </View>
              )}
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
        <View>
          <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>
          <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
        </View>
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
        {FILTROS.map((item) => {
          const ativo = filtro === item;
          const contagem = contagens[item] || 0;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.aba, ativo && styles.abaAtiva]}
              onPress={() => setFiltro(item)}
            >
              <Text style={[styles.abaTexto, ativo && styles.abaTextoAtiva]}>
                {FILTRO_LABEL[item]}
              </Text>
              {contagem > 0 && (
                <View style={[styles.abaContagem, ativo && styles.abaContagemAtiva]}>
                  <Text style={[styles.abaContagemTexto, ativo && styles.abaContagemTextoAtiva]}>
                    {contagem}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
                onRefresh={() => { setAtualizando(true); carregarTudo(); }}
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
  logo: { color: cores.texto, fontSize: 22, fontFamily: fontInter.extrabold, letterSpacing: -0.5 },
  saudacao: { color: cores.textoSecundario, fontSize: 13, fontFamily: fontInter.regular, marginTop: 2 },
  avatarGrande: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: cores.roxo,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarGrandeTexto: { color: '#fff', fontSize: 14, fontFamily: fontInter.bold },

  abas: { flexDirection: 'row', paddingHorizontal: espaco.lg, gap: 8, marginBottom: 8 },
  aba: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: raio.md,
    backgroundColor: cores.card, borderWidth: 1, borderColor: cores.cardBorda,
  },
  abaAtiva: { backgroundColor: cores.azulSuave, borderColor: cores.azul },
  abaTexto: { color: cores.textoSecundario, fontSize: 12, fontFamily: fontInter.semibold },
  abaTextoAtiva: { color: cores.azulClaro },
  abaContagem: {
    backgroundColor: cores.cardBorda, borderRadius: raio.pill,
    minWidth: 18, height: 18, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center',
  },
  abaContagemAtiva: { backgroundColor: cores.azul },
  abaContagemTexto: { color: cores.textoSecundario, fontSize: 10, fontFamily: fontInter.bold },
  abaContagemTextoAtiva: { color: '#fff' },

  lista: { padding: espaco.lg, paddingTop: 4 },
  card: {
    backgroundColor: cores.card, borderRadius: raio.lg,
    marginBottom: 12, borderWidth: 1, borderColor: cores.cardBorda, overflow: 'hidden',
  },
  cardTopo: { flexDirection: 'row' },
  faixaPrioridade: { width: 4 },
  cardConteudo: { flex: 1, padding: espaco.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  cardTitulo: { color: cores.texto, fontSize: 15, fontFamily: fontInter.bold, flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: raio.sm, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 10, fontFamily: fontInter.bold },

  solicitanteLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  avatarPequeno: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: cores.cardBorda,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPequenoTexto: { color: cores.textoSecundario, fontSize: 9, fontFamily: fontInter.bold },
  cardInfo: { color: cores.textoSecundario, fontSize: 12, fontFamily: fontInter.regular },
  tagSemTecnico: {
    backgroundColor: cores.erroSuave, borderRadius: raio.sm,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  tagSemTecnicoTexto: { color: cores.erro, fontSize: 10, fontFamily: fontInter.semibold },

  cardRodape: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatDisponivel: { color: cores.azulClaro, fontSize: 12, fontFamily: fontInter.semibold },
  cardComentarios: { color: cores.textoTerciario, fontSize: 12, fontFamily: fontInter.regular },

  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: cores.textoTerciario, fontSize: 15, fontFamily: fontInter.regular },
});
