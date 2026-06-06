import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const STATUS_COR = {
  ABERTO: '#2d6fff',
  EM_ATENDIMENTO: '#f59e0b',
  AGUARDANDO: '#8b5cf6',
  RESOLVIDO: '#10b981',
  FECHADO: '#6b7280',
};

const STATUS_LABEL = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO: 'Aguardando',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

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

  useFocusEffect(
    useCallback(() => {
      carregarChamados();
    }, [])
  );

  function renderChamado({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetalheChamado', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COR[item.status] + '22' }]}>
            <Text style={[styles.badgeTexto, { color: STATUS_COR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardCategoria}>{item.categoria} · {item.prioridade}</Text>
        {item.localizacao && (
          <Text style={styles.cardLocalizacao}>📍 {item.localizacao}</Text>
        )}
        <Text style={styles.cardData}>
          {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
        </Text>
      </TouchableOpacity>
    );
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2d6fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.bemVindo}>Olá, {usuario?.nome?.split(' ')[0]} 👋</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chamados}
        keyExtractor={(item) => item.id}
        renderItem={renderChamado}
        contentContainerStyle={chamados.length === 0 && styles.listaVazia}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => { setAtualizando(true); carregarChamados(); }}
            tintColor="#2d6fff"
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
        <Text style={styles.fabTexto}>+ Novo Chamado</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' },
  cabecalho: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 16,
  },
  bemVindo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sair: { color: '#2d6fff', fontSize: 14 },
  card: {
    backgroundColor: '#1a1d27', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2d3a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitulo: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  cardCategoria: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardLocalizacao: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardData: { color: '#555', fontSize: 11 },
  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: '#555', fontSize: 15 },
  fab: {
    backgroundColor: '#2d6fff', margin: 16, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  fabTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
