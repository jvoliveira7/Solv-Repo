import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { cores, espaco, raio, comum } from '../theme';

const PERFIL_LABEL = { USUARIO: 'Usuário', TECNICO: 'Técnico', ADMIN: 'Administrador' };

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo pra acessar o Solv.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Solv<Text style={{ color: cores.azul }}>.</Text></Text>
      </View>

      <View style={styles.cartao}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{iniciais(usuario?.nome)}</Text>
        </View>
        <Text style={styles.nome}>{usuario?.nome}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{PERFIL_LABEL[usuario?.perfil] || usuario?.perfil}</Text>
        </View>
        {usuario?.setor && <Text style={styles.setor}>{usuario.setor}</Text>}
      </View>

      <TouchableOpacity style={styles.botaoSair} onPress={confirmarSaida}>
        <Text style={styles.botaoSairTexto}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo, padding: espaco.xl },
  header: { paddingTop: 8, marginBottom: espaco.xxl },
  logo: { color: cores.texto, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  cartao: { ...comum.card, alignItems: 'center', paddingVertical: espaco.xxl },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: cores.azul,
    justifyContent: 'center', alignItems: 'center', marginBottom: espaco.md,
  },
  avatarTexto: { color: '#fff', fontSize: 22, fontWeight: '700' },
  nome: { color: cores.texto, fontSize: 18, fontWeight: '700' },
  email: { color: cores.textoSecundario, fontSize: 13, marginTop: 4 },
  badge: {
    backgroundColor: cores.azulSuave, borderRadius: raio.sm,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: espaco.md,
  },
  badgeTexto: { color: cores.azulClaro, fontSize: 12, fontWeight: '700' },
  setor: { color: cores.textoTerciario, fontSize: 12, marginTop: 8 },

  botaoSair: {
    borderRadius: raio.md, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: cores.erro, marginTop: espaco.xxl,
  },
  botaoSairTexto: { color: cores.erro, fontSize: 15, fontWeight: '700' },
});
