import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { cores, espaco, raio, comum } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { registrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [setor, setSetor] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleRegistrar() {
    if (!nome.trim() || !email.trim() || !senha) {
      Alert.alert('Atenção', 'Preencha nome, e-mail e senha.');
      return;
    }
    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    try {
      await registrar({ nome: nome.trim(), email: email.trim(), senha, setor: setor.trim() || undefined });
    } catch (err) {
      const mensagem = err.response?.data?.erro || 'Erro ao criar conta.';
      Alert.alert('Erro', mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltarBotao} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.voltarSeta}>←</Text>
        </TouchableOpacity>
        <View style={styles.topoConteudo}>
          <Text style={styles.logo}>
            Solv<Text style={styles.logoPonto}>.</Text>
          </Text>
          <Text style={styles.subtitle}>Crie sua conta pra abrir chamados</Text>
        </View>
      </View>

      <ScrollView style={styles.cartao} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.cartaoTitulo}>Criar conta</Text>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor={cores.placeholder}
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={cores.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>🏢</Text>
          <TextInput
            style={styles.input}
            placeholder="Setor (opcional)"
            placeholderTextColor={cores.placeholder}
            value={setor}
            onChangeText={setSetor}
          />
        </View>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Senha (mín. 6 caracteres)"
            placeholderTextColor={cores.placeholder}
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />
        </View>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirmar senha"
            placeholderTextColor={cores.placeholder}
            secureTextEntry
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
          />
        </View>

        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesabilitado]}
          onPress={handleRegistrar}
          disabled={carregando}
        >
          {carregando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botaoTexto}>Criar conta</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },

  topo: {
    backgroundColor: '#0d1220',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingTop: 16,
    paddingBottom: 28,
  },
  voltarBotao: { paddingHorizontal: 20, marginBottom: 8 },
  voltarSeta: { color: cores.texto, fontSize: 22 },
  topoConteudo: { paddingHorizontal: 32 },
  logo: {
    fontSize: 32, fontWeight: '800', color: cores.texto,
    textAlign: 'center', marginBottom: 6, letterSpacing: -1,
  },
  logoPonto: { color: cores.azul },
  subtitle: { fontSize: 13, color: cores.textoSecundario, textAlign: 'center' },

  cartao: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  cartaoTitulo: { color: cores.texto, fontSize: 20, fontWeight: '800', marginBottom: 20 },

  inputLinha: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: cores.card, borderRadius: raio.md,
    borderWidth: 1, borderColor: cores.cardBorda,
    paddingHorizontal: 16, marginBottom: espaco.lg,
  },
  inputIcone: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: cores.texto },

  botao: { ...comum.botaoPrimario, marginTop: espaco.md, paddingVertical: 16 },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { ...comum.botaoPrimarioTexto, fontSize: 16 },
});
