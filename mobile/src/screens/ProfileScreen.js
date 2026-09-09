import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { cores, espaco, raio, comum, fontInter } from '../theme';

const PERFIL_LABEL = { USUARIO: 'Usuário', TECNICO: 'Técnico', ADMIN: 'Administrador' };
const EH_TECNICO = (perfil) => perfil === 'TECNICO' || perfil === 'ADMIN';

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function ProfileScreen() {
  const { usuario, logout, atualizarAvatar } = useAuth();
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const [carregandoStats, setCarregandoStats] = useState(EH_TECNICO(usuario?.perfil));

  useFocusEffect(
    useCallback(() => {
      if (!EH_TECNICO(usuario?.perfil)) return;
      let ativo = true;
      (async () => {
        try {
          const { data } = await api.get('/chamados/estatisticas-tecnico');
          if (ativo) setEstatisticas(data);
        } catch {
          // silencioso — a tela mostra "—" se não conseguir carregar
        } finally {
          if (ativo) setCarregandoStats(false);
        }
      })();
      return () => { ativo = false; };
    }, [usuario?.perfil])
  );

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo pra acessar o Solv.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  async function handleTrocarFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Preciso de acesso às suas fotos pra trocar o avatar.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (resultado.canceled) return;

    setEnviandoFoto(true);
    try {
      // Redimensiona/comprime antes de mandar — mantém o payload pequeno
      const manipulada = await ImageManipulator.manipulateAsync(
        resultado.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const dataUri = `data:image/jpeg;base64,${manipulada.base64}`;
      await atualizarAvatar(dataUri);
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível atualizar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  function handleRemoverFoto() {
    Alert.alert('Remover foto?', '', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          setEnviandoFoto(true);
          try {
            await atualizarAvatar(null);
          } catch {
            Alert.alert('Erro', 'Não foi possível remover a foto.');
          } finally {
            setEnviandoFoto(false);
          }
        },
      },
    ]);
  }

  const ehTecnico = EH_TECNICO(usuario?.perfil);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>
      </View>

      <View style={styles.cartao}>
        <TouchableOpacity onPress={handleTrocarFoto} disabled={enviandoFoto} style={styles.avatarWrap}>
          {enviandoFoto ? (
            <View style={styles.avatar}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : usuario?.avatar ? (
            <Image source={{ uri: usuario.avatar }} style={styles.avatarFoto} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciais(usuario?.nome)}</Text>
            </View>
          )}
          <View style={styles.avatarEditarBadge}>
            <Text style={styles.avatarEditarIcone}>✎</Text>
          </View>
        </TouchableOpacity>

        {usuario?.avatar && !enviandoFoto && (
          <TouchableOpacity onPress={handleRemoverFoto}>
            <Text style={styles.linkRemoverFoto}>Remover foto</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.nome}>{usuario?.nome}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{PERFIL_LABEL[usuario?.perfil] || usuario?.perfil}</Text>
        </View>
        {usuario?.setor && <Text style={styles.setor}>{usuario.setor}</Text>}
      </View>

      {ehTecnico && (
        <View style={styles.statsSecao}>
          <Text style={styles.statsTitulo}>Desempenho</Text>
          <View style={styles.statsLinha}>
            <View style={styles.statCard}>
              <Text style={styles.statValor}>
                {carregandoStats ? '—' : estatisticas?.resolvidos ?? 0}
              </Text>
              <Text style={styles.statLabel}>Chamados resolvidos</Text>
            </View>

            <View style={styles.statCard}>
              {carregandoStats ? (
                <Text style={styles.statValor}>—</Text>
              ) : estatisticas?.totalAvaliacoes > 0 ? (
                <Text style={styles.statValor}>
                  {estatisticas.mediaAvaliacoes.toFixed(1)} <Text style={styles.statValorEstrela}>★</Text>
                </Text>
              ) : (
                <Text style={styles.statValorVazio}>Sem avaliações{'\n'}ainda</Text>
              )}
              <Text style={styles.statLabel}>
                {estatisticas?.totalAvaliacoes > 0
                  ? `${estatisticas.totalAvaliacoes} avaliação${estatisticas.totalAvaliacoes > 1 ? 'ões' : ''}`
                  : 'Avaliação média'}
              </Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.botaoSair} onPress={confirmarSaida}>
        <Text style={styles.botaoSairTexto}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  content: { padding: espaco.xl, paddingBottom: 40 },
  header: { paddingTop: 8, marginBottom: espaco.xxl },
  logo: { color: cores.texto, fontSize: 20, fontFamily: fontInter.extrabold, letterSpacing: -0.5 },

  cartao: { ...comum.card, alignItems: 'center', paddingVertical: espaco.xxl },
  avatarWrap: { position: 'relative', marginBottom: espaco.sm },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: cores.azul,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarFoto: { width: 84, height: 84, borderRadius: 42 },
  avatarTexto: { color: '#fff', fontSize: 28, fontFamily: fontInter.bold },
  avatarEditarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 26, height: 26, borderRadius: 13, backgroundColor: cores.azul,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: cores.card,
  },
  avatarEditarIcone: { color: '#fff', fontSize: 12 },
  linkRemoverFoto: { color: cores.erro, fontSize: 12, marginBottom: espaco.md },

  nome: { color: cores.texto, fontSize: 18, fontFamily: fontInter.bold, marginTop: espaco.sm },
  email: { color: cores.textoSecundario, fontSize: 13, marginTop: 4 },
  badge: {
    backgroundColor: cores.azulSuave, borderRadius: raio.sm,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: espaco.md,
  },
  badgeTexto: { color: cores.azulClaro, fontSize: 12, fontFamily: fontInter.bold },
  setor: { color: cores.textoTerciario, fontSize: 12, marginTop: 8 },

  statsSecao: { marginTop: espaco.xl },
  statsTitulo: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10,
  },
  statsLinha: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, ...comum.card, alignItems: 'center', paddingVertical: espaco.lg,
  },
  statValor: { color: cores.texto, fontSize: 24, fontFamily: fontInter.extrabold },
  statValorEstrela: { color: '#f5c518', fontSize: 18 },
  statValorVazio: { color: cores.textoTerciario, fontSize: 12, textAlign: 'center', lineHeight: 16 },
  statLabel: { color: cores.textoSecundario, fontSize: 11, marginTop: 6, textAlign: 'center' },

  botaoSair: {
    borderRadius: raio.md, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: cores.erro, marginTop: espaco.xxl,
  },
  botaoSairTexto: { color: cores.erro, fontSize: 15, fontFamily: fontInter.bold },
});
