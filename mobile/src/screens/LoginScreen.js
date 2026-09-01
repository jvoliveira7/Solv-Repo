import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Animated, Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { cores, espaco, raio, comum } from '../theme';

const { width: LARGURA } = Dimensions.get('window');

// Ícones de T.I. espalhados ao fundo da curva superior — pura decoração,
// baixa opacidade, sem depender de nenhuma lib de ícone.
const ICONES_FUNDO = [
  { icone: '💻', top: 18, left: '12%', rotacao: '-12deg', tamanho: 34 },
  { icone: '🖥️', top: 70, left: '78%', rotacao: '10deg', tamanho: 30 },
  { icone: '📡', top: 130, left: '20%', rotacao: '8deg', tamanho: 26 },
  { icone: '⚙️', top: 30, left: '55%', rotacao: '-6deg', tamanho: 22 },
  { icone: '🔧', top: 150, left: '68%', rotacao: '-14deg', tamanho: 24 },
  { icone: '📶', top: 95, left: '8%', rotacao: '4deg', tamanho: 20 },
  { icone: '🌐', top: 175, left: '42%', rotacao: '0deg', tamanho: 22 },
];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const brilho = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(brilho, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(brilho, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const brilhoOpacidade = brilho.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  const brilhoEscala = brilho.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });

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
      {/* Topo curvo com brilho animado e ícones de T.I. de fundo */}
      <View style={styles.topo}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.brilhoWrap,
            { opacity: brilhoOpacidade, transform: [{ scale: brilhoEscala }] },
          ]}
        >
          <View style={[styles.brilhoCamada, styles.brilhoCamada3]} />
          <View style={[styles.brilhoCamada, styles.brilhoCamada2]} />
          <View style={[styles.brilhoCamada, styles.brilhoCamada1]} />
        </Animated.View>

        {ICONES_FUNDO.map((item, i) => (
          <Text
            key={i}
            style={[
              styles.iconeFundo,
              { top: item.top, left: item.left, fontSize: item.tamanho, transform: [{ rotate: item.rotacao }] },
            ]}
          >
            {item.icone}
          </Text>
        ))}

        <View style={styles.topoConteudo}>
          <Text style={styles.logo}>
            Solv<Text style={styles.logoPonto}>.</Text>
          </Text>
          <Text style={styles.subtitle}>Suporte técnico que qualquer um consegue usar</Text>
        </View>
      </View>

      {/* Cartão inferior, sobrepondo a curva */}
      <View style={styles.cartao}>
        <Text style={styles.cartaoTitulo}>Entrar</Text>

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
          <Text style={styles.inputIcone}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={cores.placeholder}
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />
        </View>

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

        <TouchableOpacity style={styles.linkCriarConta} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkCriarContaTexto}>
            Não tem conta? <Text style={styles.linkCriarContaDestaque}>Criar conta</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const ALTURA_TOPO = 300;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },

  topo: {
    height: ALTURA_TOPO,
    backgroundColor: '#0d1220',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  brilhoWrap: {
    position: 'absolute',
    top: -140,
    left: LARGURA / 2 - 180,
    width: 360,
    height: 360,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brilhoCamada: { position: 'absolute', borderRadius: 999, backgroundColor: cores.azul },
  brilhoCamada1: { width: 140, height: 140, opacity: 0.9 },
  brilhoCamada2: { width: 240, height: 240, opacity: 0.35 },
  brilhoCamada3: { width: 360, height: 360, opacity: 0.15 },
  iconeFundo: {
    position: 'absolute',
    opacity: 0.14,
  },
  topoConteudo: {
    paddingHorizontal: 32,
    paddingBottom: 36,
  },
  logo: {
    fontSize: 44, fontWeight: '800', color: cores.texto,
    textAlign: 'center', marginBottom: 10, letterSpacing: -1,
  },
  logoPonto: { color: cores.azul },
  subtitle: {
    fontSize: 14, color: cores.textoSecundario,
    textAlign: 'center', paddingHorizontal: 20,
  },

  cartao: {
    flex: 1,
    backgroundColor: cores.fundo,
    marginTop: -28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  cartaoTitulo: { color: cores.texto, fontSize: 20, fontWeight: '800', marginBottom: 22 },

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
  linkCriarConta: { marginTop: espaco.xl, alignItems: 'center' },
  linkCriarContaTexto: { color: cores.textoTerciario, fontSize: 13 },
  linkCriarContaDestaque: { color: cores.azulClaro, fontWeight: '700' },
});
