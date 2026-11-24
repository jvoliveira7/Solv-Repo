import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { cores, espaco, raio, comum, fontInter } from '../theme';

// Uma única tela para os dois cadastros. Quem decide é o parâmetro de rota
// `perfil` (definido no AppNavigator); qualquer outro valor cai em USUARIO.
// O servidor é quem manda de verdade: o perfil gravado depende da ROTA da API
// (/registro ou /registro-tecnico) e do código de acesso, nunca desta tela.
const CONFIG = {
  USUARIO: {
    subtitulo: 'Crie sua conta pra abrir chamados',
    titulo: 'Criar conta',
    aviso: 'Para criar sua conta, use o código de acesso da organização, divulgado internamente pela sua instituição.',
    placeholderCodigo: 'Código de acesso da organização',
    erroCodigo: 'Informe o código de acesso da organização.',
    textoBotao: 'Criar conta',
  },
  TECNICO: {
    subtitulo: 'Cadastro de técnico',
    titulo: 'Criar conta de técnico',
    aviso: 'Precisa do código de acesso técnico, fornecido pela sua equipe/administrador.',
    placeholderCodigo: 'Código de acesso técnico',
    erroCodigo: 'Informe o código de acesso técnico.',
    textoBotao: 'Criar conta de técnico',
  },
};

export default function RegisterScreen({ navigation, route }) {
  const perfil = route?.params?.perfil === 'TECNICO' ? 'TECNICO' : 'USUARIO';
  const cfg = CONFIG[perfil];
  const { registrar, registrarTecnico } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [setor, setSetor] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleRegistrar() {
    if (!nome.trim() || !email.trim() || !senha) {
      Alert.alert('Atenção', 'Preencha nome, e-mail e senha.');
      return;
    }
    if (!codigoAcesso.trim()) {
      Alert.alert('Atenção', cfg.erroCodigo);
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
      const cadastrar = perfil === 'TECNICO' ? registrarTecnico : registrar;
      await cadastrar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        setor: setor.trim() || undefined,
        codigoAcesso: codigoAcesso.trim(),
      });
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
          <Text style={styles.subtitle}>{cfg.subtitulo}</Text>
        </View>
      </View>

      <ScrollView style={styles.cartao} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.cartaoTitulo}>{cfg.titulo}</Text>
        <Text style={styles.cartaoAviso}>{cfg.aviso}</Text>

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
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>🏢</Text>
          <TextInput
            style={styles.input}
            placeholder="Setor "
            placeholderTextColor={cores.placeholder}
            value={setor}
            onChangeText={setSetor}
          />
        </View>

        <View style={styles.inputLinha}>
          <Text style={styles.inputIcone}>🔑</Text>
          <TextInput
            style={styles.input}
            placeholder={cfg.placeholderCodigo}
            placeholderTextColor={cores.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            value={codigoAcesso}
            onChangeText={setCodigoAcesso}
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
            : <Text style={styles.botaoTexto}>{cfg.textoBotao}</Text>
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
    fontSize: 32, fontFamily: fontInter.extrabold, color: cores.texto,
    textAlign: 'center', marginBottom: 6, letterSpacing: -1,
  },
  logoPonto: { color: cores.azul },
  subtitle: { fontSize: 13, color: cores.textoSecundario, textAlign: 'center' },

  cartao: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  cartaoTitulo: { color: cores.texto, fontSize: 20, fontFamily: fontInter.extrabold, marginBottom: 8 },
  cartaoAviso: { color: cores.textoTerciario, fontSize: 13, lineHeight: 18, marginBottom: 20 },

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
