import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { cores, espaco, raio, comum, fontInter } from '../theme';

export default function AjustesScreen() {
  const { logout } = useAuth();

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo pra acessar o Solv.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.secaoTitulo}>Notificações</Text>
      <View style={styles.card}>
        <View style={styles.linha}>
          <View style={styles.linhaIcone}>
            <Ionicons name="notifications-outline" size={18} color={cores.textoSecundario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaTitulo}>Notificações push</Text>
            <Text style={styles.linhaDescricao}>Em breve — avisos de novas mensagens e atualizações de chamado direto no celular.</Text>
          </View>
          <Switch value={false} disabled trackColor={{ false: cores.cardBorda, true: cores.azul }} />
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Conta</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.botaoSair} onPress={confirmarSaida}>
          <Ionicons name="log-out-outline" size={18} color={cores.erro} />
          <Text style={styles.botaoSairTexto}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo, padding: espaco.xl },
  secaoTitulo: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
  },
  card: { ...comum.card, marginBottom: espaco.lg },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linhaIcone: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: cores.fundo,
    justifyContent: 'center', alignItems: 'center',
  },
  linhaTitulo: { color: cores.texto, fontSize: 14, fontFamily: fontInter.bold },
  linhaDescricao: { color: cores.textoTerciario, fontSize: 12, marginTop: 2, lineHeight: 16 },

  botaoSair: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  botaoSairTexto: { color: cores.erro, fontSize: 15, fontFamily: fontInter.bold },
});
