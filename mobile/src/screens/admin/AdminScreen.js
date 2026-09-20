import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { cores, espaco, raio, comum, fontInter, statusCor, statusLabel, prioridadeCor } from '../../theme';
import Avatar from '../../components/Avatar';

const ORDEM_STATUS = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'RESOLVIDO', 'FECHADO'];
const ORDEM_PRIORIDADE = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];
const PRIORIDADE_LABEL = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
const CATEGORIA_LABEL = {
  HARDWARE: 'Hardware', SOFTWARE: 'Software', REDE: 'Rede',
  ACESSO: 'Acesso', IMPRESSORA: 'Impressora', OUTRO: 'Outro',
};

function formatarTempo(horas) {
  if (horas === null || horas === undefined) return '—';
  if (horas < 1) return '< 1 h';
  if (horas < 48) return `${horas.toFixed(1).replace('.', ',')} h`;
  return `${(horas / 24).toFixed(1).replace('.', ',')} d`;
}

function Kpi({ rotulo, valor, cor, icone }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiTopo}>
        <Ionicons name={icone} size={15} color={cor || cores.textoTerciario} />
        <Text style={styles.kpiRotulo}>{rotulo}</Text>
      </View>
      <Text style={[styles.kpiValor, cor && { color: cor }]}>{valor}</Text>
    </View>
  );
}

// Barras horizontais proporcionais ao maior valor do grupo
function Barras({ itens }) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <View style={{ gap: 10 }}>
      {itens.map((i) => (
        <View key={i.chave}>
          <View style={styles.barraTopo}>
            <Text style={styles.barraRotulo}>{i.rotulo}</Text>
            <Text style={styles.barraValor}>{i.valor}</Text>
          </View>
          <View style={styles.barraTrilho}>
            <View
              style={[
                styles.barraPreenchida,
                { width: `${(i.valor / maximo) * 100}%`, backgroundColor: i.cor },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function Atalho({ icone, titulo, subtitulo, badge, onPress }) {
  return (
    <TouchableOpacity style={styles.atalho} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.atalhoIcone}>
        <Ionicons name={icone} size={20} color={cores.azulClaro} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.atalhoTitulo}>{titulo}</Text>
        <Text style={styles.atalhoSub}>{subtitulo}</Text>
      </View>
      {badge > 0 && (
        <View style={styles.atalhoBadge}>
          <Text style={styles.atalhoBadgeTexto}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={cores.textoTerciario} />
    </TouchableOpacity>
  );
}

export default function AdminScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/visao-geral');
      setDados(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a visão geral.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  if (!dados) {
    return (
      <View style={styles.centro}>
        <Text style={styles.vazio}>Sem dados para mostrar.</Text>
      </View>
    );
  }

  const { chamados, avaliacoes, usuarios, denunciasPendentes, ranking } = dados;

  const barrasStatus = ORDEM_STATUS.map((s) => ({
    chave: s, rotulo: statusLabel[s], valor: chamados.porStatus[s] || 0, cor: statusCor[s],
  }));
  const barrasPrioridade = ORDEM_PRIORIDADE.map((p) => ({
    chave: p, rotulo: PRIORIDADE_LABEL[p], valor: chamados.porPrioridade[p] || 0, cor: prioridadeCor[p],
  }));
  const barrasCategoria = Object.keys(CATEGORIA_LABEL)
    .map((c) => ({
      chave: c, rotulo: CATEGORIA_LABEL[c], valor: chamados.porCategoria[c] || 0, cor: cores.azul,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: espaco.xl, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => { setAtualizando(true); carregar(); }}
          tintColor={cores.azulClaro}
        />
      }
    >
      <Text style={styles.titulo}>Painel administrativo</Text>
      <Text style={styles.subtitulo}>Visão geral do atendimento</Text>

      <View style={styles.kpiGrade}>
        <Kpi rotulo="Chamados" valor={chamados.total} icone="file-tray-full-outline" />
        <Kpi
          rotulo="Sem técnico"
          valor={chamados.semTecnico}
          icone="alert-circle-outline"
          cor={chamados.semTecnico > 0 ? cores.aviso : undefined}
        />
        <Kpi rotulo="Tempo médio" valor={formatarTempo(chamados.tempoMedioResolucaoHoras)} icone="time-outline" />
        <Kpi
          rotulo="Nota média"
          valor={avaliacoes.media ? `${avaliacoes.media.toFixed(1).replace('.', ',')} ★` : '—'}
          icone="star-outline"
          cor={avaliacoes.media ? cores.aviso : undefined}
        />
      </View>

      <Text style={styles.secaoTitulo}>Últimos 7 dias</Text>
      <View style={[comum.card, styles.linhaDupla]}>
        <View style={styles.metade}>
          <Text style={styles.grande}>{chamados.criadosUltimos7Dias}</Text>
          <Text style={styles.legenda}>chamados abertos</Text>
        </View>
        <View style={styles.divisorVertical} />
        <View style={styles.metade}>
          <Text style={[styles.grande, { color: cores.sucesso }]}>{chamados.resolvidosUltimos7Dias}</Text>
          <Text style={styles.legenda}>resolvidos</Text>
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Chamados por status</Text>
      <View style={comum.card}><Barras itens={barrasStatus} /></View>

      <Text style={styles.secaoTitulo}>Por prioridade</Text>
      <View style={comum.card}><Barras itens={barrasPrioridade} /></View>

      <Text style={styles.secaoTitulo}>Por categoria</Text>
      <View style={comum.card}><Barras itens={barrasCategoria} /></View>

      <Text style={styles.secaoTitulo}>Ranking de técnicos</Text>
      <View style={comum.card}>
        {ranking.length === 0 ? (
          <Text style={styles.vazio}>Nenhum técnico cadastrado.</Text>
        ) : (
          ranking.map((t, i) => (
            <View key={t.id} style={[styles.rankLinha, i > 0 && styles.rankLinhaBorda]}>
              <Text style={styles.rankPosicao}>{i + 1}</Text>
              <Avatar uri={t.avatar} nome={t.nome} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rankNome} numberOfLines={1}>
                  {t.nome}{t.suspenso ? ' · suspenso' : ''}
                </Text>
                <Text style={styles.rankSub}>
                  {t.time || 'Sem time'} · {t.resolvidos} resolvido(s)
                </Text>
              </View>
              <Text style={styles.rankNota}>
                {t.mediaAvaliacoes ? `${t.mediaAvaliacoes.toFixed(1).replace('.', ',')} ★` : '—'}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.secaoTitulo}>Pessoas</Text>
      <View style={[comum.card, styles.linhaDupla]}>
        <View style={styles.metade}>
          <Text style={styles.grande}>{usuarios.porPerfil.USUARIO || 0}</Text>
          <Text style={styles.legenda}>usuários</Text>
        </View>
        <View style={styles.divisorVertical} />
        <View style={styles.metade}>
          <Text style={styles.grande}>{(usuarios.porPerfil.TECNICO || 0) + (usuarios.porPerfil.ADMIN || 0)}</Text>
          <Text style={styles.legenda}>técnicos/admins</Text>
        </View>
        <View style={styles.divisorVertical} />
        <View style={styles.metade}>
          <Text style={[styles.grande, usuarios.suspensos > 0 && { color: cores.erro }]}>{usuarios.suspensos}</Text>
          <Text style={styles.legenda}>suspensos</Text>
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Gestão</Text>
      <View style={{ gap: 10 }}>
        <Atalho
          icone="alert-circle"
          titulo="Denúncias"
          subtitulo="Relatos dos usuários sobre técnicos"
          badge={denunciasPendentes}
          onPress={() => navigation.navigate('Denuncias')}
        />
        <Atalho
          icone="people-circle"
          titulo="Usuários e funções"
          subtitulo="Promover, rebaixar ou suspender contas"
          onPress={() => navigation.navigate('GerenciarUsuarios')}
        />
        <Atalho
          icone="people"
          titulo="Times"
          subtitulo="Grupos de técnicos por especialidade"
          onPress={() => navigation.navigate('TimesTab', { screen: 'GerenciarTimes' })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo },
  vazio: { color: cores.textoTerciario, fontSize: 14, textAlign: 'center' },

  titulo: { color: cores.texto, fontSize: 24, fontFamily: fontInter.extrabold },
  subtitulo: { color: cores.textoSecundario, fontSize: 14, marginTop: 2, marginBottom: espaco.lg },

  kpiGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { ...comum.card, width: '48%', padding: espaco.md },
  kpiTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiRotulo: { color: cores.textoSecundario, fontSize: 12, fontFamily: fontInter.semibold },
  kpiValor: { color: cores.texto, fontSize: 24, fontFamily: fontInter.extrabold, marginTop: 6 },

  secaoTitulo: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: espaco.xl,
  },

  linhaDupla: { flexDirection: 'row', alignItems: 'center' },
  metade: { flex: 1, alignItems: 'center' },
  divisorVertical: { width: 1, alignSelf: 'stretch', backgroundColor: cores.cardBorda },
  grande: { color: cores.texto, fontSize: 26, fontFamily: fontInter.extrabold },
  legenda: { color: cores.textoTerciario, fontSize: 12, marginTop: 2 },

  barraTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barraRotulo: { color: cores.textoSecundario, fontSize: 13 },
  barraValor: { color: cores.texto, fontSize: 13, fontFamily: fontInter.bold },
  barraTrilho: { height: 6, borderRadius: 3, backgroundColor: cores.cardBorda, overflow: 'hidden' },
  barraPreenchida: { height: 6, borderRadius: 3 },

  rankLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  rankLinhaBorda: { borderTopWidth: 1, borderTopColor: cores.cardBorda },
  rankPosicao: { width: 16, color: cores.textoTerciario, fontSize: 13, fontFamily: fontInter.bold, textAlign: 'center' },
  rankNome: { color: cores.texto, fontSize: 14, fontFamily: fontInter.semibold },
  rankSub: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },
  rankNota: { color: cores.aviso, fontSize: 13, fontFamily: fontInter.bold },

  atalho: {
    ...comum.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: espaco.md,
  },
  atalhoIcone: {
    width: 38, height: 38, borderRadius: raio.md, backgroundColor: cores.azulSuave,
    justifyContent: 'center', alignItems: 'center',
  },
  atalhoTitulo: { color: cores.texto, fontSize: 15, fontFamily: fontInter.bold },
  atalhoSub: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },
  atalhoBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: cores.erro,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  atalhoBadgeTexto: { color: '#fff', fontSize: 12, fontFamily: fontInter.bold },
});
