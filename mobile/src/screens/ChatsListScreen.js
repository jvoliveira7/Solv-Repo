import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { cores, espaco, raio } from '../theme';
import { tempoRelativo } from '../utils/tempoRelativo';

const STATUS_LABEL = { PENDENTE: 'Pendente', ATIVA: 'Ativo', ENCERRADA: 'Encerrado' };

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function ChatsListScreen({ navigation, route }) {
  const isTecnico = route?.params?.isTecnico ?? false;
  const [chats, setChats] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarChats() {
    setErro(null);
    try {
      const { data } = await api.get('/chats');
      setChats(data);
    } catch (err) {
      setErro(err.response?.data?.erro || err.message || 'Erro desconhecido');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregarChats(); }, []));

  function abrirChat(item) {
    if (item.status === 'PENDENTE') {
      // Convite ainda não aceito — deixa o usuário resolver isso no chamado,
      // onde os botões de aceitar/recusar já existem.
      navigation.navigate(isTecnico ? 'DetalheChamadoTecnico' : 'DetalheChamado', { id: item.chamadoId });
      return;
    }
    navigation.navigate('Chat', {
      sessaoId: item.sessaoId,
      chamadoTitulo: item.chamadoTitulo,
      contato: item.contato,
      isTecnico,
    });
  }

  function renderItem({ item }) {
    const ultima = item.ultimaMensagem;
    return (
      <TouchableOpacity style={styles.linha} onPress={() => abrirChat(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{iniciais(item.contato?.nome)}</Text>
        </View>

        <View style={styles.conteudo}>
          <View style={styles.linhaTopo}>
            <Text style={styles.nome} numberOfLines={1}>{item.contato?.nome || 'Contato'}</Text>
            {ultima && <Text style={styles.hora}>{tempoRelativo(ultima.criadoEm)}</Text>}
          </View>

          <Text style={styles.chamadoTitulo} numberOfLines={1}>#{item.chamadoTitulo}</Text>

          {ultima ? (
            <Text style={[styles.previa, item.naoLidas > 0 && styles.previaNaoLida]} numberOfLines={1}>
              {ultima.texto}
            </Text>
          ) : (
            <Text style={styles.previaVazia}>
              {item.status === 'PENDENTE' ? 'Convite pendente' : 'Sem mensagens ainda'}
            </Text>
          )}
        </View>

        {item.naoLidas > 0 && (
          <View style={styles.badgeNaoLidas}>
            <Text style={styles.badgeNaoLidasTexto}>{item.naoLidas}</Text>
          </View>
        )}
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
      <View style={styles.header}>
        <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>
        <Text style={styles.headerTitulo}>Chats</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.sessaoId}
        renderItem={renderItem}
        contentContainerStyle={chats.length === 0 ? styles.listaVazia : styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => { setAtualizando(true); carregarChats(); }}
            tintColor={cores.azul}
          />
        }
        ListEmptyComponent={
          erro
            ? <Text style={styles.erroTexto}>Erro ao carregar: {erro}</Text>
            : <Text style={styles.vazioTexto}>Nenhuma conversa ainda.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo },

  header: { paddingHorizontal: espaco.xl, paddingTop: 16, paddingBottom: 8 },
  logo: { color: cores.texto, fontSize: 14, fontWeight: '800', opacity: 0.6 },
  headerTitulo: { color: cores.texto, fontSize: 22, fontWeight: '800', marginTop: 2 },

  lista: { paddingBottom: 20 },
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: espaco.xl, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: cores.cardBorda,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: cores.azul,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },

  conteudo: { flex: 1 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  nome: { color: cores.texto, fontSize: 15, fontWeight: '700', flex: 1 },
  hora: { color: cores.textoTerciario, fontSize: 11 },
  chamadoTitulo: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },
  previa: { color: cores.textoSecundario, fontSize: 13, marginTop: 3 },
  previaNaoLida: { color: cores.texto, fontWeight: '600' },
  previaVazia: { color: cores.textoTerciario, fontSize: 13, marginTop: 3, fontStyle: 'italic' },

  badgeNaoLidas: {
    backgroundColor: cores.azul, borderRadius: raio.pill,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeNaoLidasTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },

  listaVazia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vazioTexto: { color: cores.textoTerciario, fontSize: 15 },
  erroTexto: { color: cores.erro, fontSize: 13, textAlign: 'center', paddingHorizontal: espaco.xl },
});
