import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { conectarSocket } from '../../services/socketService';
import api from '../../services/api';
import { cores, espaco, raio, comum, fontInter } from '../../theme';
import Avatar from '../../components/Avatar';
import { useEvitarTeclado } from '../../hooks/useEvitarTeclado';

const CATEGORIA_ICONE = {
  HARDWARE: '🖥️', SOFTWARE: '💾', REDE: '📶',
  ACESSO: '🔑', IMPRESSORA: '🖨️', OUTRO: '⋯',
};

// Android: View comum + useEvitarTeclado; iOS: KeyboardAvoidingView padrão
const Container = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

export default function TimeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ref, sobreposicao, tecladoVisivel } = useEvitarTeclado();
  const { usuario } = useAuth();
  // Sem param: "meu time" (aba Time do técnico). Com param: ADMIN olhando um
  // time específico a partir de GerenciarTimesScreen — mesma tela, fonte
  // de dados diferente.
  const timeId = route?.params?.timeId;
  const [time, setTime] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalMembros, setModalMembros] = useState(false);
  const [disponiveis, setDisponiveis] = useState([]);
  const socketRef = useRef(null);
  const listaRef = useRef(null);

  const carregarTime = useCallback(async () => {
    try {
      let timeCarregado;
      if (timeId) {
        const { data } = await api.get(`/times/${timeId}`);
        timeCarregado = data;
      } else {
        const { data } = await api.get('/times/meu');
        timeCarregado = data.time;
      }
      setTime(timeCarregado);

      if (timeCarregado) {
        const { data: msgs } = await api.get(`/times/${timeCarregado.id}/mensagens`);
        setMensagens(msgs);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o time.');
    } finally {
      setCarregando(false);
    }
  }, [timeId]);

  useFocusEffect(useCallback(() => { carregarTime(); }, [carregarTime]));

  // Chat em grupo — mesma ideia do ChatScreen, com handlers nomeados pra
  // não derrubar os listeners globais do ChatContext no cleanup.
  useEffect(() => {
    let montado = true;

    function aoReceberMensagemTime(msg) {
      if (montado) setMensagens((prev) => [...prev, msg]);
    }

    (async () => {
      try {
        const socket = await conectarSocket();
        if (!montado) return;
        socketRef.current = socket;
        socket.on('nova_mensagem_time', aoReceberMensagemTime);
      } catch {
        // sem socket o histórico via REST ainda funciona — só não é ao vivo
      }
    })();

    return () => {
      montado = false;
      socketRef.current?.off('nova_mensagem_time', aoReceberMensagemTime);
    };
  }, []);

  function enviar() {
    if (!texto.trim() || !time) return;
    socketRef.current?.emit('mensagem_time', { timeId: time.id, texto });
    setTexto('');
  }

  async function abrirModalMembros() {
    try {
      const { data } = await api.get('/times/tecnicos-disponiveis');
      // quem já está neste time some da lista; o próprio usuário (ex.: o ADMIN
      // que criou o time) pode se adicionar como qualquer outro
      setDisponiveis(data.filter((t) => t.timeId !== time.id));
      setModalMembros(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a lista de técnicos.');
    }
  }

  async function adicionarMembro(tecnico) {
    try {
      const { data } = await api.post(`/times/${time.id}/membros`, { usuarioId: tecnico.id });
      setTime((prev) => ({ ...prev, membros: data.membros }));
      setModalMembros(false);
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível adicionar.');
    }
  }

  function confirmarRemocao(membro) {
    Alert.alert('Remover do time?', `${membro.nome} sai do time e volta pra fila geral.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await api.delete(`/times/${time.id}/membros/${membro.id}`);
            setTime((prev) => ({ ...prev, membros: data.membros }));
          } catch (err) {
            Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível remover.');
          }
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  // Sem time — estado vazio explicativo (texto muda se é "meu time" vazio
  // ou se o ADMIN entrou num time que, por algum motivo, não existe mais)
  if (!time) {
    return (
      <View style={[styles.centro, { paddingHorizontal: espaco.xl }]}>
        <Ionicons name="people-outline" size={48} color={cores.textoTerciario} />
        <Text style={styles.vazioTitulo}>
          {timeId ? 'Time não encontrado' : 'Você ainda não está em um time'}
        </Text>
        {!timeId && (
          <Text style={styles.vazioTexto}>
            Times agrupam técnicos por especialidade. Um administrador precisa te adicionar a um.
          </Text>
        )}
        {usuario?.perfil === 'ADMIN' && (
          <TouchableOpacity
            style={styles.botaoGerenciar}
            onPress={() => (timeId ? navigation.goBack() : navigation.navigate('GerenciarTimes'))}
          >
            <Text style={styles.botaoGerenciarTexto}>
              {timeId ? 'Voltar' : 'Gerenciar times'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderMensagem({ item }) {
    const minha = item.autor.id === usuario?.id;
    return (
      <View style={[styles.linhaMsg, minha ? styles.linhaMsgMinha : styles.linhaMsgOutra]}>
        {!minha && <Avatar uri={item.autor.avatar} nome={item.autor.nome} size={26} />}
        <View style={[styles.bolha, minha ? styles.bolhaMinha : styles.bolhaOutra]}>
          {!minha && <Text style={styles.bolhaAutor}>{item.autor.nome}</Text>}
          <Text style={[styles.bolhaTexto, minha && styles.bolhaTextoMinha]}>{item.texto}</Text>
          <Text style={[styles.bolhaHora, minha && styles.bolhaHoraMinha]}>
            {new Date(item.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Container
      ref={ref}
      collapsable={false}
      style={[styles.container, { paddingBottom: sobreposicao }]}
      {...(Platform.OS === 'ios' ? { behavior: 'padding' } : {})}
    >
      <View style={[styles.cabecalho, { paddingTop: insets.top + 16 }]}>
        <View style={styles.cabecalhoTopo}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botaoIcone} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={cores.textoSecundario} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.timeNome}>{time.nome}</Text>
            <Text style={styles.timeSub}>{time.membros.length} técnico(s) no time</Text>
          </View>
          {usuario?.perfil === 'ADMIN' && !timeId && (
            <TouchableOpacity onPress={() => navigation.navigate('GerenciarTimes')} style={styles.botaoIcone} hitSlop={8}>
              <Ionicons name="settings-outline" size={18} color={cores.textoSecundario} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.categoriasLinha}>
          {time.categorias.map((c) => (
            <View key={c} style={styles.categoriaChip}>
              <Text style={styles.categoriaChipTexto}>{CATEGORIA_ICONE[c] || '⋯'} {c}</Text>
            </View>
          ))}
        </View>

        <View style={styles.membrosLinha}>
          {time.membros.map((m) => (
            <TouchableOpacity
              key={m.id}
              onLongPress={() => (
                time.podeGerenciar
                && (m.id !== usuario?.id || usuario?.perfil === 'ADMIN')
                && confirmarRemocao(m)
              )}
              activeOpacity={time.podeGerenciar ? 0.7 : 1}
            >
              <View style={styles.membroAvatar}>
                <Avatar uri={m.avatar} nome={m.nome} size={30} cor={m.adminDoTime ? cores.azul : cores.cardBorda} />
                {m.adminDoTime && <View style={styles.coroaAdmin}><Text style={styles.coroaTexto}>★</Text></View>}
              </View>
            </TouchableOpacity>
          ))}
          {time.podeGerenciar && (
            <TouchableOpacity style={styles.botaoAddMembro} onPress={abrirModalMembros}>
              <Ionicons name="add" size={18} color={cores.azulClaro} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        ref={listaRef}
        data={mensagens}
        keyExtractor={(item) => item.id}
        renderItem={renderMensagem}
        contentContainerStyle={styles.lista}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.semMensagens}>Nenhuma mensagem no time ainda. Comece a conversa! 💬</Text>
        }
      />

      <View style={[styles.inputArea, { paddingBottom: tecladoVisivel ? 12 : insets.bottom + 12 }]}>
        <TextInput
          style={styles.input}
          placeholder="Mensagem para o time..."
          placeholderTextColor={cores.placeholder}
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={enviar}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.botaoEnviar, !texto.trim() && { opacity: 0.4 }]}
          onPress={enviar}
          disabled={!texto.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={modalMembros} transparent animationType="slide" onRequestClose={() => setModalMembros(false)}>
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { paddingBottom: insets.bottom + espaco.lg }]}>
            <Text style={styles.modalTitulo}>Adicionar ao time</Text>
            {disponiveis.length === 0 ? (
              <Text style={styles.semMensagens}>Nenhum técnico disponível.</Text>
            ) : (
              <FlatList
                data={disponiveis}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 320 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.linhaDisponivel} onPress={() => adicionarMembro(item)}>
                    <Avatar uri={item.avatar} nome={item.nome} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.disponivelNome}>
                        {item.nome}{item.id === usuario?.id ? ' (você)' : ''}
                      </Text>
                      <Text style={styles.disponivelSub}>
                        {item.time ? `Hoje no time ${item.time.nome}` : 'Sem time'}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={cores.azulClaro} />
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalFechar} onPress={() => setModalMembros(false)}>
              <Text style={styles.modalFecharTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo, gap: 12 },
  vazioTitulo: { color: cores.texto, fontSize: 17, fontFamily: fontInter.bold, textAlign: 'center' },
  vazioTexto: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  botaoGerenciar: { ...comum.botaoPrimario, paddingHorizontal: 24, marginTop: 8 },
  botaoGerenciarTexto: { ...comum.botaoPrimarioTexto },

  cabecalho: {
    paddingHorizontal: espaco.xl, paddingBottom: espaco.lg,
    borderBottomWidth: 1, borderBottomColor: cores.cardBorda,
  },
  cabecalhoTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeNome: { color: cores.texto, fontSize: 20, fontFamily: fontInter.extrabold },
  timeSub: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  botaoIcone: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: cores.card,
    borderWidth: 1, borderColor: cores.cardBorda, justifyContent: 'center', alignItems: 'center',
  },

  categoriasLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  categoriaChip: {
    backgroundColor: cores.azulSuave, borderRadius: raio.sm,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  categoriaChipTexto: { color: cores.azulClaro, fontSize: 11, fontFamily: fontInter.semibold },

  membrosLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  membroAvatar: { position: 'relative' },
  coroaAdmin: {
    position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7,
    backgroundColor: cores.aviso, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: cores.fundo,
  },
  coroaTexto: { color: '#000', fontSize: 8, fontFamily: fontInter.bold },
  botaoAddMembro: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: cores.azul,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },

  lista: { padding: espaco.lg },
  semMensagens: { color: cores.textoTerciario, fontSize: 14, textAlign: 'center', marginTop: 32 },
  linhaMsg: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 12 },
  linhaMsgMinha: { justifyContent: 'flex-end' },
  linhaMsgOutra: { justifyContent: 'flex-start' },
  bolha: { maxWidth: '76%', borderRadius: raio.lg, paddingHorizontal: 13, paddingVertical: 9 },
  bolhaMinha: { backgroundColor: cores.azul, borderBottomRightRadius: 4 },
  bolhaOutra: { backgroundColor: cores.card, borderBottomLeftRadius: 4 },
  bolhaAutor: { color: cores.azulClaro, fontSize: 11, fontFamily: fontInter.bold, marginBottom: 3 },
  bolhaTexto: { color: cores.textoSecundario, fontSize: 15, lineHeight: 20 },
  bolhaTextoMinha: { color: '#fff' },
  bolhaHora: { color: cores.textoTerciario, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bolhaHoraMinha: { color: '#ffffff99' },

  inputArea: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: cores.cardBorda,
  },
  input: {
    flex: 1, backgroundColor: cores.card, borderRadius: raio.pill,
    paddingHorizontal: 18, paddingVertical: 12, color: cores.texto, fontSize: 15,
  },
  botaoEnviar: {
    backgroundColor: cores.azul, width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },

  modalFundo: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCaixa: {
    backgroundColor: cores.card, borderTopLeftRadius: raio.xl, borderTopRightRadius: raio.xl,
    padding: espaco.xl,
  },
  modalTitulo: { color: cores.texto, fontSize: 17, fontFamily: fontInter.bold, marginBottom: espaco.lg },
  linhaDisponivel: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: cores.cardBorda,
  },
  disponivelNome: { color: cores.texto, fontSize: 15, fontFamily: fontInter.semibold },
  disponivelSub: { color: cores.textoTerciario, fontSize: 12, marginTop: 1 },
  modalFechar: { alignItems: 'center', paddingVertical: 14, marginTop: espaco.sm },
  modalFecharTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.semibold },
});
