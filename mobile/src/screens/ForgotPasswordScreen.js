import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import api from '../services/api';
import { cores, espaco, raio, comum, fontInter } from '../theme';

const ESPERA_REENVIO_S = 60;

export default function ForgotPasswordScreen({ navigation, route }) {
  const [etapa, setEtapa] = useState('email'); // 'email' | 'codigo'
  const [email, setEmail] = useState(route.params?.email || '');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function pedirCodigo() {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe o e-mail da sua conta.');
      return;
    }
    setCarregando(true);
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() });
      setEtapa('codigo');
      setEspera(ESPERA_REENVIO_S);
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível enviar o código.');
    } finally {
      setCarregando(false);
    }
  }

  async function reenviar() {
    if (espera > 0) return;
    setCarregando(true);
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() });
      setEspera(ESPERA_REENVIO_S);
      Alert.alert('Código reenviado', 'Confira sua caixa de entrada (e o spam).');
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível reenviar o código.');
    } finally {
      setCarregando(false);
    }
  }

  async function redefinir() {
    if (codigo.trim().length !== 6) {
      Alert.alert('Atenção', 'O código tem 6 dígitos.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    try {
      await api.post('/auth/redefinir-senha', { email: email.trim(), codigo: codigo.trim(), novaSenha });
      Alert.alert('Senha redefinida', 'Agora você já pode entrar com a nova senha.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível redefinir a senha.');
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
          <Text style={styles.subtitle}>Recuperação de senha</Text>
        </View>
      </View>

      <ScrollView style={styles.cartao} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {etapa === 'email' ? (
          <>
            <Text style={styles.cartaoTitulo}>Esqueceu a senha?</Text>
            <Text style={styles.aviso}>
              Informe o e-mail da sua conta. Vamos enviar um código de 6 dígitos, válido por 15 minutos.
            </Text>

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

            <TouchableOpacity
              style={[styles.botao, carregando && styles.botaoDesabilitado]}
              onPress={pedirCodigo}
              disabled={carregando}
            >
              {carregando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.botaoTexto}>Enviar código</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.cartaoTitulo}>Digite o código</Text>
            <Text style={styles.aviso}>
              Se {email.trim()} estiver cadastrado, enviamos um código de 6 dígitos para ele. Ele vale por 15 minutos.
            </Text>

            <View style={styles.inputLinha}>
              <Text style={styles.inputIcone}>🔑</Text>
              <TextInput
                style={[styles.input, styles.inputCodigo]}
                placeholder="Código de 6 dígitos"
                placeholderTextColor={cores.placeholder}
                keyboardType="number-pad"
                maxLength={6}
                value={codigo}
                onChangeText={(t) => setCodigo(t.replace(/\D/g, ''))}
              />
            </View>

            <View style={styles.inputLinha}>
              <Text style={styles.inputIcone}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Nova senha (mín. 6 caracteres)"
                placeholderTextColor={cores.placeholder}
                secureTextEntry
                value={novaSenha}
                onChangeText={setNovaSenha}
              />
            </View>

            <View style={styles.inputLinha}>
              <Text style={styles.inputIcone}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirmar nova senha"
                placeholderTextColor={cores.placeholder}
                secureTextEntry
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
              />
            </View>

            <TouchableOpacity
              style={[styles.botao, carregando && styles.botaoDesabilitado]}
              onPress={redefinir}
              disabled={carregando}
            >
              {carregando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.botaoTexto}>Redefinir senha</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.link} onPress={reenviar} disabled={espera > 0 || carregando}>
              <Text style={[styles.linkTexto, espera > 0 && { opacity: 0.6 }]}>
                {espera > 0 ? `Reenviar código em ${espera}s` : 'Não recebeu? Reenviar código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.link} onPress={() => { setEtapa('email'); setCodigo(''); }}>
              <Text style={styles.linkTexto}>Usar outro e-mail</Text>
            </TouchableOpacity>
          </>
        )}
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
    fontSize: 32, fontFamily: fontInter.extrabold, color: cores.texto,
    textAlign: 'center', marginBottom: 6, letterSpacing: -1,
  },
  logoPonto: { color: cores.azul },
  subtitle: { fontSize: 13, color: cores.textoSecundario, textAlign: 'center' },

  cartao: { flex: 1, paddingHorizontal: 28, paddingTop: 24 },
  cartaoTitulo: { color: cores.texto, fontSize: 20, fontFamily: fontInter.extrabold, marginBottom: 8 },
  aviso: { color: cores.textoTerciario, fontSize: 13, lineHeight: 19, marginBottom: 20 },

  inputLinha: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: cores.card, borderRadius: raio.md,
    borderWidth: 1, borderColor: cores.cardBorda,
    paddingHorizontal: 16, marginBottom: espaco.lg,
  },
  inputIcone: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: cores.texto },
  inputCodigo: { letterSpacing: 4, fontFamily: fontInter.semibold },

  botao: { ...comum.botaoPrimario, marginTop: espaco.md, paddingVertical: 16 },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { ...comum.botaoPrimarioTexto, fontSize: 16 },

  link: { alignItems: 'center', marginTop: espaco.lg },
  linkTexto: { color: cores.azulClaro, fontSize: 14, fontFamily: fontInter.semibold },
});
