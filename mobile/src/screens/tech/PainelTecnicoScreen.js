import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cores, espaco, raio, statusCor, statusLabel, prioridadeCor, fontInter } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';
import Avatar from '../../components/Avatar';

const FILTROS = ['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO'];
// A aba "Abertos" busca também EM_ATENDIMENTO/AGUARDANDO pra poder montar a
// seção "Meus chamados ativos" — o badge de contagem continua refletindo só
// o status ABERTO de verdade (igual à seção "Sem técnico").
const FILTRO_STATUS = {
  ABERTO: 'ABERTO,EM_ATENDIMENTO,AGUARDANDO',
  EM_ATENDIMENTO: 'EM_ATENDIMENTO,AGUARDANDO',
  RESOLVIDO: 'RESOLVIDO,FECHADO',
};
const FILTRO_LABEL = { ABERTO: 'Abertos', EM_ATENDIMENTO: 'Em andamento', RESOLVIDO: 'Resolvidos' };

const CATEGORIA_ICONE = {
  HARDWARE: '🖥️',
  SOFTWARE: '💾',
  REDE: '📶',
  ACESSO: '🔑',
  IMPRESSORA: '🖨️',
  OUTRO: '⋯',
};

// Escalonamento visual por idade do chamado (desde criadoEm) — quanto mais
// tempo parado, mais chamativo o alerta. Limites são um ponto de partida.
const ESCALONAMENTO_IDADE = {
  normal: { cor: cores.textoTerciario, icone: '🕓' },
  aviso: { cor: cores.aviso, icone: '⏱️' },
  alerta: { cor: cores.erro, icone: '🔥' },
};

function nivelIdade(dataCriacao) {
  const horas = (Date.now() - new Date(dataCriacao).getTime()) / 3600000;
  if (horas >= 24) return 'alerta';
  if (horas >= 4) return 'aviso';
  return 'normal';
}

export default function PainelTecnicoScreen({ navigation }) {
  const { usuario } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [contagens, setContagens] = useState({ ABERTO: 0, EM_ATENDIMENTO: 0, RESOLVIDO: 0 });
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState('ABERTO');
  const [assumindoId, setAssumindoId] = useState(null);

  async function carregarTudo() {
    try {
      const [chamadosResp, contagensResp] = await Promise.all([
        api.get('/chamados', { params: { status: FILTRO_STATUS[filtro] } }),
        api.get('/chamados/contagem'),
      ]);
      setChamados(chamadosResp.data);
      setContagens(contagensResp.data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os chamados.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarTudo(); }, [filtro]));

  async function handleAssumir(id) {
    setAssumindoId(id);
    try {
      await api.patch(`/chamados/${id}/status`, { status: 'EM_ATENDIMENTO' });
      await carregarTudo();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível assumir o chamado.');
    } finally {
      setAssumindoId(null);
    }
  }

  function renderChamado({ item }) {
    const semTecnico = !item.tecnicoId;
    const aguardando = item.status === 'AGUARDANDO';
    const chatDisponivel = item.chat?.status === 'ATIVA' || item.chat?.status === 'PENDENTE';
    const assumindo = assumindoId === item.id;
    const idade = ESCALONAMENTO_IDADE[nivelIdade(item.criadoEm)];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
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
              <Avatar uri={item.solicitante.avatar} nome={item.solicitante.nome} size={22} cor={cores.roxo} fonteSize={9} />
              <Text style={styles.cardInfo} numberOfLines={1}>{item.solicitante.nome}</Text>
              <Text style={styles.categoriaTag} numberOfLines={1}>
                {CATEGORIA_ICONE[item.categoria] || CATEGORIA_ICONE.OUTRO} {item.categoria}
              </Text>
            </View>

            <View style={styles.cardRodape}>
              <View style={[styles.badge, { backgroundColor: statusCor[item.status] + '22' }]}>
                <Text style={[styles.badgeTexto, { color: statusCor[item.status] }]}>
                  {statusLabel[item.status]}
                </Text>
              </View>
              <Text style={[styles.tempoTexto, { color: idade.cor }]}>
                {idade.icone} {tempoRelativo(item.criadoEm)}
              </Text>
              {chatDisponivel && (
                <Text style={styles.chatDisponivel}>💬 Chat</Text>
              )}
              {item._count.comentarios > 0 && (
                <Text style={styles.cardComentarios}>📝 {item._count.comentarios}</Text>
              )}
            </View>

            {aguardando && (
              <View style={styles.aguardandoFaixa}>
                <Text style={styles.aguardandoTexto}>
                  ⏳ Aguardando resposta {tempoRelativo(item.atualizadoEm)}
                </Text>
              </View>
            )}

            {semTecnico && (
              <TouchableOpacity
                style={[styles.botaoAssumir, assumindo && { opacity: 0.6 }]}
                onPress={() => handleAssumir(item.id)}
                disabled={assumindo}
              >
                {assumindo
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.botaoAssumirTexto}>Assumir chamado</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const secoes = filtro === 'ABERTO'
    ? [
        { chave: 'sem-tecnico', titulo: 'Sem técnico', dados: chamados.filter((c) => !c.tecnicoId) },
        {
          chave: 'meus-ativos',
          titulo: 'Meus chamados ativos',
          dados: chamados.filter((c) => c.tecnicoId === usuario?.id && (c.status === 'EM_ATENDIMENTO' || c.status === 'AGUARDANDO')),
        },
      ]
    : [{ chave: 'lista', titulo: null, dados: chamados }];

  const sections = secoes
    .filter((s) => s.dados.length > 0)
    .map((s) => ({ key: s.chave, title: s.titulo, data: s.dados }));

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <View style={styles.cabecalhoTopo}>
          <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>

          <View style={styles.acoesTopo}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Ajustes')}
              style={styles.botaoIcone}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={20} color={cores.textoSecundario} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('PerfilTab')}>
              <View style={styles.avatarWrap}>
                <Avatar uri={usuario?.avatar} nome={usuario?.nome} size={36} cor={cores.roxo} />
                <View style={styles.pontoOnline} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
        <Text style={styles.subtitulo}>Fila de atendimento</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.abasScroll}
        contentContainerStyle={styles.abas}
      >
        {FILTROS.map((item) => {
          const ativo = filtro === item;
          const contagem = contagens[item] || 0;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.aba, ativo && styles.abaAtiva]}
              onPress={() => setFiltro(item)}
            >
              <Text style={[styles.abaTexto, ativo && styles.abaTextoAtiva]} numberOfLines={1}>
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
      </ScrollView>

      {carregando
        ? <ActivityIndicator size="large" color={cores.azul} style={{ marginTop: 40 }} />
        : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderChamado}
            renderSectionHeader={({ section }) => section.title ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderTexto}>{section.title}</Text>
                <Text style={styles.sectionHeaderContagem}>{section.data.length}</Text>
              </View>
            ) : null}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={sections.length === 0 ? styles.listaVazia : styles.lista}
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
  cabecalho: { padding: espaco.xl, paddingTop: 16, paddingBottom: 16 },
  cabecalhoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { color: cores.texto, fontSize: 20, fontFamily: fontInter.extrabold, letterSpacing: -0.5 },
  acoesTopo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  botaoIcone: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: cores.card,
    borderWidth: 1, borderColor: cores.cardBorda, justifyContent: 'center', alignItems: 'center',
  },
  avatarWrap: { position: 'relative' },
  pontoOnline: {
    position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6,
    backgroundColor: cores.sucesso, borderWidth: 2, borderColor: cores.fundo,
  },
  saudacao: { color: cores.texto, fontSize: 22, fontFamily: fontInter.extrabold, marginTop: espaco.lg },
  subtitulo: { color: cores.textoSecundario, fontSize: 14, marginTop: 3 },

  // altura fixa pra blindar contra qualquer stretch implícito do flexbox
  // (a ScrollView horizontal, sem isso, deixava os chips virarem retângulos
  // gigantes verticalmente em vez de pílulas pequenas)
  abasScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 52 },
  abas: { paddingHorizontal: espaco.lg, gap: 6, marginBottom: 8, alignItems: 'flex-start' },
  aba: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 40, paddingHorizontal: 12, borderRadius: raio.md,
    backgroundColor: cores.card, borderWidth: 1, borderColor: cores.cardBorda,
  },
  abaAtiva: { backgroundColor: cores.azulSuave, borderColor: cores.azul },
  abaTexto: { color: cores.textoSecundario, fontSize: 12, lineHeight: 16, fontFamily: fontInter.semibold },
  abaTextoAtiva: { color: cores.azulClaro },
  abaContagem: {
    backgroundColor: cores.cardBorda, borderRadius: raio.pill,
    minWidth: 18, height: 18, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center',
  },
  abaContagemAtiva: { backgroundColor: cores.azul },
  abaContagemTexto: { color: cores.textoSecundario, fontSize: 10, fontFamily: fontInter.bold },
  abaContagemTextoAtiva: { color: '#fff' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: espaco.lg, marginTop: 12, marginBottom: 8,
  },
  sectionHeaderTexto: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  sectionHeaderContagem: { color: cores.textoTerciario, fontSize: 11, fontFamily: fontInter.semibold },

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

  solicitanteLinha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cardInfo: { color: cores.textoSecundario, fontSize: 12, fontFamily: fontInter.regular, flexShrink: 1, maxWidth: '55%' },
  categoriaTag: { color: cores.textoTerciario, fontSize: 12, fontFamily: fontInter.regular },

  cardRodape: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tempoTexto: { fontSize: 12, fontFamily: fontInter.semibold },
  chatDisponivel: { color: cores.azulClaro, fontSize: 12, fontFamily: fontInter.semibold },
  cardComentarios: { color: cores.textoTerciario, fontSize: 12, fontFamily: fontInter.regular },

  aguardandoFaixa: {
    backgroundColor: cores.infoSuave, borderRadius: raio.sm,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 10,
  },
  aguardandoTexto: { color: cores.info, fontSize: 12, fontFamily: fontInter.semibold },

  botaoAssumir: {
    backgroundColor: cores.azul, borderRadius: raio.sm,
    paddingVertical: 11, alignItems: 'center', marginTop: 12,
  },
  botaoAssumirTexto: { color: '#fff', fontSize: 13, fontFamily: fontInter.bold },

  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: cores.textoTerciario, fontSize: 15, fontFamily: fontInter.regular },
});
