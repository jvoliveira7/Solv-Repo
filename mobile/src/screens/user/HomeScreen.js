import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cores, espaco, raio, statusCor, statusLabel } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function HomeScreen({ navigation }) {
  const { usuario, logout } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  async function carregarChamados() {
    try {
      const { data } = await api.get('/chamados');
      setChamados(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os chamados.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarChamados(); }, []));

  function renderChamado({ item }) {
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

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>
          <Text style={styles.bemVindo}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('PerfilTab')} style={styles.avatar}>
          <Text style={styles.avatarTexto}>{iniciais(usuario?.nome)}</Text>
        </TouchableOpacity>
      </View>

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
  cabecalho: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: espaco.xl, paddingTop: 16,
  },
  logo: { color: cores.texto, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  bemVindo: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: cores.azul,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { color: '#fff', fontSize: 13, fontWeight: '700' },

  lista: { paddingHorizontal: espaco.lg, paddingBottom: 90 },
  card: { ...{ backgroundColor: cores.card, borderRadius: raio.lg, padding: espaco.lg, marginBottom: 12, borderWidth: 1, borderColor: cores.cardBorda } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  cardTitulo: { color: cores.texto, fontSize: 15, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: raio.sm },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  cardCategoria: { color: cores.textoSecundario, fontSize: 12, marginBottom: 4 },
  cardLocalizacao: { color: cores.textoSecundario, fontSize: 12, marginBottom: 4 },
  cardData: { color: cores.textoTerciario, fontSize: 11 },
  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: cores.textoTerciario, fontSize: 15 },

  fab: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    backgroundColor: cores.azul, borderRadius: raio.md,
    paddingVertical: 16, alignItems: 'center',
  },
  fabTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
