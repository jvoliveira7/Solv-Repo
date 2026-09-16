import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSincronizacao } from '../../context/SincronizacaoContext';
import api from '../../services/api';
import { salvarCache, lerCache } from '../../storage/cacheStorage';
import { cores, espaco, raio, statusCor, statusLabel, fontInter } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';
import Avatar from '../../components/Avatar';
import OfflineBanner from '../../components/OfflineBanner';

const CHAVE_CACHE = 'home_chamados';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { usuario, logout } = useAuth();
  const { pendentes } = useSincronizacao();
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  async function carregarChamados() {
    try {
      const { data } = await api.get('/chamados');
      setChamados(data);
      salvarCache(CHAVE_CACHE, data);
    } catch {
      const cache = await lerCache(CHAVE_CACHE);
      if (cache) {
        setChamados(cache);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os chamados.');
      }
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarChamados(); }, []));

  function renderChamado({ item }) {
    if (item.pendente) {
      const falhou = !!item.erroPermanente;
      const cor = falhou ? cores.erro : cores.aviso;
      return (
        <View style={[styles.card, styles.cardPendente]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
            <View style={[styles.badge, { backgroundColor: cor + '22' }]}>
              <Text style={[styles.badgeTexto, { color: cor }]}>
                {falhou ? 'Falha ao enviar' : 'Pendente de envio'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardCategoria}>{item.categoria} · {item.prioridade}</Text>
          {falhou && <Text style={styles.cardErro}>{item.erroPermanente}</Text>}
          <Text style={styles.cardData}>Salvo {tempoRelativo(item.criadoEm)}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetalheChamado', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
          <View style={[styles.badge, { backgroundColor: statusCor[item.status] + '22' }]}>
            <Text style={[styles.badgeTexto, { color: statusCor[item.status] }]}>
              {statusLabel[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardCategoria}>{item.categoria} · {item.prioridade}</Text>
        {item.localizacao && (
          <Text style={styles.cardLocalizacao}>📍 {item.localizacao}</Text>
        )}
        <Text style={styles.cardData}>{tempoRelativo(item.criadoEm)}</Text>
      </TouchableOpacity>
    );
  }

  const dadosLista = [
    ...pendentes.map((p) => ({ id: p.idLocal, pendente: true, erroPermanente: p.erroPermanente, criadoEm: p.criadoEm, ...p.payload })),
    ...chamados,
  ];

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.cabecalho, { paddingTop: insets.top + 16 }]}>
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
                <Avatar uri={usuario?.avatar} nome={usuario?.nome} size={36} />
                <View style={styles.pontoOnline} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
        <Text style={styles.subtitulo}>Como podemos te ajudar hoje?</Text>
      </View>

      <OfflineBanner />

      <FlatList
        data={dadosLista}
        keyExtractor={(item) => item.id}
        renderItem={renderChamado}
        contentContainerStyle={dadosLista.length === 0 ? styles.listaVazia : styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => { setAtualizando(true); carregarChamados(); }}
            tintColor={cores.azul}
          />
        }
        ListEmptyComponent={
          <Text style={styles.vazioTexto}>Nenhum chamado aberto ainda.</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NovoChamado')}
      >
        <Text style={styles.fabTexto}>+ Novo chamado</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo },
  cabecalho: { padding: espaco.xl, paddingTop: 16, paddingBottom: 20 },
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

  lista: { paddingHorizontal: espaco.lg, paddingBottom: 90 },
  card: { ...{ backgroundColor: cores.card, borderRadius: raio.lg, padding: espaco.lg, marginBottom: 12, borderWidth: 1, borderColor: cores.cardBorda } },
  cardPendente: { borderStyle: 'dashed', opacity: 0.85 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  cardTitulo: { color: cores.texto, fontSize: 15, fontFamily: fontInter.bold, flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: raio.sm },
  badgeTexto: { fontSize: 11, fontFamily: fontInter.bold },
  cardCategoria: { color: cores.textoSecundario, fontSize: 12, marginBottom: 4 },
  cardLocalizacao: { color: cores.textoSecundario, fontSize: 12, marginBottom: 4 },
  cardErro: { color: cores.erro, fontSize: 12, marginBottom: 4 },
  cardData: { color: cores.textoTerciario, fontSize: 11 },
  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: cores.textoTerciario, fontSize: 15 },

  fab: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    backgroundColor: cores.azul, borderRadius: raio.md,
    paddingVertical: 16, alignItems: 'center',
  },
  fabTexto: { color: '#fff', fontSize: 16, fontFamily: fontInter.bold },
});
