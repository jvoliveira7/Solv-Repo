import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { cores, espaco, raio, comum } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleLogin() {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      await login(email.trim(), senha);
    } catch (err) {
      const mensagem = err.response?.data?.erro || 'Erro ao conectar ao servidor.';
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
      <View style={styles.inner}>
        <Text style={styles.logo}>
          Solv<Text style={styles.logoPonto}>.</Text>
        </Text>
        <Text style={styles.subtitle}>Suporte técnico que qualquer um consegue usar</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={cores.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={cores.placeholder}
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesabilitado]}
          onPress={handleLogin}
          disabled={carregando}
        >
          {carregando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botaoTexto}>Entrar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: {
    fontSize: 44, fontWeight: '800', color: cores.texto,
    textAlign: 'center', marginBottom: 10, letterSpacing: -1,
  },
  logoPonto: { color: cores.azul },
  subtitle: {
    fontSize: 14, color: cores.textoSecundario,
    textAlign: 'center', marginBottom: 48, paddingHorizontal: 20,
  },
  input: { ...comum.input, marginBottom: espaco.lg, paddingVertical: 14, fontSize: 16 },
  botao: { ...comum.botaoPrimario, marginTop: espaco.xs, paddingVertical: 16 },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { ...comum.botaoPrimarioTexto, fontSize: 16 },
});
