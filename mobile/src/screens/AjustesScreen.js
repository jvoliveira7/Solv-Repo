import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Switch,
  Modal, TextInput, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotificacoes } from '../context/NotificacaoContext';
import { cores, espaco, raio, comum, fontInter } from '../theme';

export default function AjustesScreen() {
  const { usuario, logout, atualizarSetor } = useAuth();
  const { ativas, alternarNotificacoes } = useNotificacoes();
  const [modalSetor, setModalSetor] = useState(false);
  const [novoSetor, setNovoSetor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const setorAtual = usuario?.setor || '';

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo pra acessar o Solv.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  function abrirModalSetor() {
    setNovoSetor(setorAtual);
    setModalSetor(true);
  }

  async function salvarSetor(valor) {
    setSalvando(true);
    try {
      await atualizarSetor(valor);
      setModalSetor(false);
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível atualizar o setor.');
    } finally {
      setSalvando(false);
    }
  }

  // Segunda confirmação: só depois do "Tem certeza?" o setor é realmente gravado
  function confirmarAlteracao() {
    const digitado = novoSetor.trim();

    if (!digitado) {
      Alert.alert('Atenção', 'Digite o novo setor ou use "Remover setor".');
      return;
    }
    if (digitado === setorAtual) {
      Alert.alert('Atenção', 'Esse já é o seu setor atual.');
      return;
    }

    Alert.alert(
      'Tem certeza?',
      setorAtual
        ? `Seu setor vai mudar de "${setorAtual}" para "${digitado}".`
        : `Seu setor vai ser definido como "${digitado}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sim, alterar', onPress: () => salvarSetor(digitado) },
      ]
    );
  }

  function confirmarRemocao() {
    Alert.alert(
      'Tem certeza?',
      `Você vai ficar sem setor de trabalho (hoje: "${setorAtual}").`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sim, remover', style: 'destructive', onPress: () => salvarSetor(null) },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.secaoTitulo}>Perfil</Text>
      <View style={styles.card}>
        <View style={styles.linha}>
          <View style={styles.linhaIcone}>
            <Ionicons name="business-outline" size={18} color={cores.textoSecundario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaTitulo}>Setor de trabalho</Text>
            <Text style={styles.linhaDescricao}>{setorAtual || 'Não informado'}</Text>
          </View>
          <TouchableOpacity style={styles.botaoAlterar} onPress={abrirModalSetor} hitSlop={8}>
            <Text style={styles.botaoAlterarTexto}>{setorAtual ? 'Alterar' : 'Definir'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Notificações</Text>
      <View style={styles.card}>
        <View style={styles.linha}>
          <View style={styles.linhaIcone}>
            <Ionicons name="notifications-outline" size={18} color={cores.textoSecundario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linhaTitulo}>Notificações push</Text>
            <Text style={styles.linhaDescricao}>Avisos de novas mensagens, pedidos de chat e chamados urgentes direto no celular.</Text>
          </View>
          <Switch
            value={ativas}
            onValueChange={alternarNotificacoes}
            trackColor={{ false: cores.cardBorda, true: cores.azul }}
          />
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Conta</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.botaoSair} onPress={confirmarSaida}>
          <Ionicons name="log-out-outline" size={18} color={cores.erro} />
          <Text style={styles.botaoSairTexto}>Sair da conta</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalSetor} transparent animationType="fade" onRequestClose={() => setModalSetor(false)}>
        <Pressable style={styles.modalFundo} onPress={() => !salvando && setModalSetor(false)}>
          <Pressable style={styles.modalCaixa} onPress={() => {}}>
            <Text style={styles.modalTitulo}>Setor de trabalho</Text>
            <Text style={styles.modalSub}>
              Informe o setor onde você trabalha. Você pode mudar quando quiser.
            </Text>

            <TextInput
              style={[comum.input, { backgroundColor: cores.fundo, marginTop: espaco.lg }]}
              placeholder="Ex: Recursos Humanos"
              placeholderTextColor={cores.placeholder}
              value={novoSetor}
              onChangeText={setNovoSetor}
              maxLength={80}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.botaoSalvar, salvando && { opacity: 0.6 }]}
              onPress={confirmarAlteracao}
              disabled={salvando}
            >
              {salvando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.botaoSalvarTexto}>Salvar</Text>}
            </TouchableOpacity>

            {!!setorAtual && (
              <TouchableOpacity style={styles.botaoRemover} onPress={confirmarRemocao} disabled={salvando}>
                <Text style={styles.botaoRemoverTexto}>Remover setor</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalSetor(false)} disabled={salvando}>
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

  botaoAlterar: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: raio.pill,
    borderWidth: 1, borderColor: cores.azul, backgroundColor: cores.azulSuave,
  },
  botaoAlterarTexto: { color: cores.azulClaro, fontSize: 13, fontFamily: fontInter.semibold },

  botaoSair: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  botaoSairTexto: { color: cores.erro, fontSize: 15, fontFamily: fontInter.bold },

  // diálogo no alto da tela pra o teclado nunca cobrir o campo
  modalFundo: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-start', paddingTop: 90, paddingHorizontal: espaco.xl },
  modalCaixa: { backgroundColor: cores.card, borderRadius: raio.xl, padding: espaco.xl },
  modalTitulo: { color: cores.texto, fontSize: 18, fontFamily: fontInter.extrabold },
  modalSub: { color: cores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 6 },
  botaoSalvar: { ...comum.botaoPrimario, marginTop: espaco.lg },
  botaoSalvarTexto: { ...comum.botaoPrimarioTexto },
  botaoRemover: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  botaoRemoverTexto: { color: cores.erro, fontSize: 14, fontFamily: fontInter.semibold },
  botaoCancelar: { alignItems: 'center', paddingVertical: 8 },
  botaoCancelarTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.semibold },
});
