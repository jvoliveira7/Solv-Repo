import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PRIORIDADE_COR = {
  CRITICA: '#7c3aed', ALTA: '#ef4444', MEDIA: '#f59e0b', BAIXA: '#10b981',
};
const STATUS_COR = {
  ABERTO: '#2d6fff', EM_ATENDIMENTO: '#f59e0b',
  AGUARDANDO: '#8b5cf6', RESOLVIDO: '#10b981', FECHADO: '#6b7280',
};
const STATUS_LABEL = {
  ABERTO: 'Aberto', EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO: 'Aguardando', RESOLVIDO: 'Resolvido', FECHADO: 'Fechado',
};

const FILTROS = ['TODOS', 'ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'RESOLVIDO'];

export default function PainelTecnicoScreen({ navigation }) {
  const { usuario, logout } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState('TODOS');

  async function carregarChamados() {
    try {
      const params = filtro !== 'TODOS' ? { status: filtro } : {};
      const { data } = await api.get('/chamados', { params });
      // Ordena: CRITICA → ALTA → MEDIA → BAIXA
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
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetalheChamadoTecnico', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.prioridadeDot, { backgroundColor: PRIORIDADE_COR[item.prioridade] }]} />
          <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COR[item.status] + '22' }]}>
            <Text style={[styles.badgeTexto, { color: STATUS_COR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardInfo}>{item.solicitante.nome} · {item.categoria}</Text>
        {item.localizacao && <Text style={styles.cardInfo}>📍 {item.localizacao}</Text>}
        <View style={styles.cardFooter}>
          <Text style={styles.cardData}>{new Date(item.criadoEm).toLocaleDateString('pt-BR')}</Text>
          <Text style={styles.cardComentarios}>💬 {item._count.comentarios}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.bemVindo}>Olá, {usuario?.nome?.split(' ')[0]} 🔧</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <FlatList
        horizontal
        data={FILTROS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtros}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filtro, filtro === item && styles.filtroAtivo]}
            onPress={() => setFiltro(item)}
          >
            <Text style={[styles.filtroTexto, filtro === item && styles.filtroTextoAtivo]}>
              {item === 'TODOS' ? 'Todos' : STATUS_LABEL[item]}
            </Text>
          </TouchableOpacity>
        )}
      />

      {carregando
        ? <ActivityIndicator size="large" color="#2d6fff" style={{ marginTop: 40 }} />
        : (
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
              <Text style={styles.vazioTexto}>Nenhum chamado encontrado.</Text>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  cabecalho: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, paddingTop: 16,
  },
  bemVindo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sair: { color: '#2d6fff', fontSize: 14 },
  filtros: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filtro: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#2a2d3a', backgroundColor: '#1a1d27',
  },
  filtroAtivo: { backgroundColor: '#2d6fff22', borderColor: '#2d6fff' },
  filtroTexto: { color: '#888', fontSize: 13 },
  filtroTextoAtivo: { color: '#2d6fff', fontWeight: '600' },
  card: {
    backgroundColor: '#1a1d27', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2d3a',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  prioridadeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardTitulo: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  cardInfo: { color: '#888', fontSize: 12, marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardData: { color: '#555', fontSize: 11 },
  cardComentarios: { color: '#555', fontSize: 11 },
  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: '#555', fontSize: 15 },
});
