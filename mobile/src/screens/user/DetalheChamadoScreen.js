import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useChatSessao } from '../../hooks/useChatSessao';
import { cores, espaco, raio, comum, statusCor, statusLabel, prioridadeCor, fontInter } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';
import Avatar from '../../components/Avatar';
import Estrelas from '../../components/Estrelas';
import AvaliacaoModal from '../../components/AvaliacaoModal';

export default function DetalheChamadoScreen({ route, navigation }) {
  const { id } = route.params;
  const [chamado, setChamado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [modalAvaliacaoVisivel, setModalAvaliacaoVisivel] = useState(false);

  const { sessao: sessaoChat, solicitar } = useChatSessao(id);

  async function carregarChamado() {
    try {
      const { data } = await api.get(`/chamados/${id}`);
      setChamado(data);
      const podeAvaliarAgora = (data.status === 'RESOLVIDO' || data.status === 'FECHADO') && !!data.tecnicoId;
      if (podeAvaliarAgora && !data.avaliacao) {
        // só sugere automaticamente uma vez por chamado — fica marcado no
        // dispositivo pra não "popar" de novo toda vez que reabrir a tela
        const chaveSugestao = `@solv:avaliacao_sugerida:${id}`;
        const jaSugerida = await AsyncStorage.getItem(chaveSugestao);
        if (!jaSugerida) {
          await AsyncStorage.setItem(chaveSugestao, '1');
          // pequeno atraso pra deixar a transição de navegação assentar antes
          // do modal subir por cima
          setTimeout(() => setModalAvaliacaoVisivel(true), 450);
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o chamado.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarChamado();
    const unsubscribe = navigation.addListener('focus', carregarChamado);
    return unsubscribe;
  }, []);

  function handleSolicitarChat() {
    if (!chamado?.tecnicoId) {
      Alert.alert('Atenção', 'Este chamado ainda não tem um técnico atribuído.');
      return;
    }
    solicitar();
  }

  function handleAbrirChat() {
    navigation.navigate('Chat', {
      sessaoId: sessaoChat.id,
      chamadoTitulo: chamado?.titulo,
      contato: chamado?.tecnico,
      isTecnico: false,
    });
  }

  async function handleComentario() {
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/chamados/${id}/comentarios`, { texto: comentario });
      setComentario('');
      carregarChamado();
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o comentário.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleAvaliar(nota, comentarioTexto) {
    if (nota < 1) return;
    setEnviandoAvaliacao(true);
    try {
      await api.post(`/chamados/${id}/avaliacao`, {
        nota,
        comentario: comentarioTexto?.trim() || undefined,
      });
      setModalAvaliacaoVisivel(false);
      await carregarChamado();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  if (!chamado) return null;

  const podeChat = chamado.status === 'EM_ATENDIMENTO' && chamado.tecnicoId;
  const mostrarSecaoChat = podeChat || chamado.status === 'ABERTO' || chamado.status === 'AGUARDANDO';
  const chatAtivo = sessaoChat?.status === 'ATIVA';
  const chatPendente = sessaoChat?.status === 'PENDENTE';
  const chatHistorico = sessaoChat?.status === 'ENCERRADA';
  // O usuário só inicia via solicitação (fica pendente aguardando o técnico).
  // Quando o técnico abre direto, a sessão já chega ATIVA (cai em chatAtivo).
  const aguardandoTecnico = chatPendente && sessaoChat.iniciadoPor === 'USUARIO';
  const podeAvaliar = (chamado.status === 'RESOLVIDO' || chamado.status === 'FECHADO') && !!chamado.tecnicoId;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>

        {/* Card hero */}
        <View style={styles.hero}>
          <View style={[styles.statusBadge, { backgroundColor: statusCor[chamado.status] + '22' }]}>
            <Text style={[styles.statusBadgeTexto, { color: statusCor[chamado.status] }]}>
              {statusLabel[chamado.status]}
            </Text>
          </View>

          <Text style={styles.titulo}>{chamado.titulo}</Text>

          <View style={styles.chipsLinha}>
            <View style={[styles.chip, { backgroundColor: cores.cardBorda }]}>
              <Text style={styles.chipTexto}>{chamado.categoria}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: prioridadeCor[chamado.prioridade] + '22' }]}>
              <Text style={[styles.chipTexto, { color: prioridadeCor[chamado.prioridade] }]}>{chamado.prioridade}</Text>
            </View>
          </View>

          <View style={styles.metaLista}>
            {chamado.tecnico && (
              <View style={styles.metaLinha}>
                <Avatar uri={chamado.tecnico.avatar} nome={chamado.tecnico.nome} size={20} cor={cores.azul} fonteSize={9} />
                <Text style={styles.metaTexto}>Técnico: {chamado.tecnico.nome}</Text>
              </View>
            )}
            {chamado.localizacao && (
              <View style={styles.metaLinha}>
                <Text style={styles.metaIcone}>📍</Text>
                <Text style={styles.metaTexto}>{chamado.localizacao}</Text>
              </View>
            )}
            <View style={styles.metaLinha}>
              <Text style={styles.metaIcone}>🕓</Text>
              <Text style={styles.metaTexto}>Aberto {tempoRelativo(chamado.criadoEm)}</Text>
            </View>
          </View>
        </View>

        {/* Chat */}
        {podeChat ? (
          <View style={styles.secaoChat}>
            {chatAtivo ? (
              <TouchableOpacity style={styles.botaoChat} onPress={handleAbrirChat}>
                <Text style={styles.botaoChatTexto}>💬 Abrir chat</Text>
              </TouchableOpacity>
            ) : aguardandoTecnico ? (
              <View style={[styles.botaoChat, styles.botaoChatPendente]}>
                <ActivityIndicator size="small" color={cores.aviso} style={{ marginRight: 8 }} />
                <Text style={[styles.botaoChatTexto, { color: cores.aviso }]}>Aguardando técnico...</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.botaoChat, styles.botaoChatSolicitar]} onPress={handleSolicitarChat}>
                <Text style={[styles.botaoChatTexto, { color: cores.azulClaro }]}>💬 Solicitar chat com técnico</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : mostrarSecaoChat ? (
          <View style={styles.secaoChat}>
            <View style={[styles.botaoChat, styles.botaoChatDesabilitado]}>
              <Text style={[styles.botaoChatTexto, { color: cores.textoTerciario }]}>
                💬 O chat fica disponível assim que um técnico assumir o chamado
              </Text>
            </View>
          </View>
        ) : null}

        {chatHistorico && (
          <View style={styles.secaoChat}>
            <TouchableOpacity style={[styles.botaoChat, styles.botaoChatHistorico]} onPress={handleAbrirChat}>
              <Text style={[styles.botaoChatTexto, { color: cores.textoSecundario }]}>📄 Ver histórico do chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Avaliação */}
        {chamado.avaliacao ? (
          <View style={styles.avaliacaoCard}>
            <Text style={styles.avaliacaoTitulo}>Sua avaliação</Text>
            <Estrelas valor={chamado.avaliacao.nota} tamanho={22} />
            {chamado.avaliacao.comentario ? (
              <Text style={styles.avaliacaoComentarioTexto}>{chamado.avaliacao.comentario}</Text>
            ) : null}
            <Text style={styles.avaliacaoData}>Enviada {tempoRelativo(chamado.avaliacao.criadoEm)}</Text>
          </View>
        ) : podeAvaliar ? (
          <TouchableOpacity
            style={styles.avaliacaoPrompt}
            onPress={() => setModalAvaliacaoVisivel(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.avaliacaoTitulo}>Como foi o atendimento?</Text>
              <Text style={styles.avaliacaoSubtitulo}>Toque para avaliar o técnico</Text>
            </View>
            <Text style={styles.avaliacaoPromptSeta}>›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Descrição */}
        <Text style={styles.secaoTitulo}>Descrição</Text>
        <View style={comum.card}>
          <Text style={styles.descricao}>{chamado.descricao}</Text>
        </View>

        {/* Comentários */}
        <Text style={styles.secaoTitulo}>Histórico ({chamado.comentarios.length})</Text>
        {chamado.comentarios.length === 0 && (
          <Text style={styles.vazioTexto}>Nenhum comentário ainda.</Text>
        )}
        {chamado.comentarios.map((c) => (
          <View key={c.id} style={styles.comentario}>
            <View style={styles.comentarioTopo}>
              <Avatar uri={c.autor.avatar} nome={c.autor.nome} size={28} cor={cores.cardBorda} fonteSize={10} />
              <View style={{ flex: 1 }}>
                <Text style={styles.comentarioAutor}>{c.autor.nome}
                  <Text style={styles.comentarioPerfil}> · {c.autor.perfil}</Text>
                </Text>
                <Text style={styles.comentarioData}>{tempoRelativo(c.criadoEm)}</Text>
              </View>
            </View>
            <Text style={styles.comentarioTexto}>{c.texto}</Text>
          </View>
        ))}

      </ScrollView>

      {chamado.status !== 'FECHADO' && (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.inputComentario}
            placeholder="Adicionar comentário..."
            placeholderTextColor={cores.placeholder}
            value={comentario}
            onChangeText={setComentario}
          />
          <TouchableOpacity
            style={[styles.botaoEnviar, enviando && { opacity: 0.6 }]}
            onPress={handleComentario}
            disabled={enviando}
          >
            {enviando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.botaoEnviarTexto}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <AvaliacaoModal
        visible={modalAvaliacaoVisivel}
        tecnico={chamado.tecnico}
        enviando={enviandoAvaliacao}
        onFechar={() => setModalAvaliacaoVisivel(false)}
        onEnviar={handleAvaliar}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo },
  content: { padding: espaco.xl, paddingBottom: 16 },

  hero: { ...comum.card, marginBottom: espaco.lg },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.sm, marginBottom: 12 },
  statusBadgeTexto: { fontSize: 11, fontFamily: fontInter.bold },
  titulo: { color: cores.texto, fontSize: 20, fontFamily: fontInter.extrabold, marginBottom: 10 },
  chipsLinha: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.sm },
  chipTexto: { color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold },

  metaLista: { gap: 8, borderTopWidth: 1, borderTopColor: cores.cardBorda, paddingTop: 12 },
  metaLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaIcone: { fontSize: 13, width: 20 },
  metaAvatar: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: cores.azul,
    justifyContent: 'center', alignItems: 'center',
  },
  metaAvatarTexto: { color: '#fff', fontSize: 9, fontFamily: fontInter.bold },
  metaTexto: { color: cores.textoSecundario, fontSize: 13 },

  secaoChat: { marginBottom: espaco.lg },
  botaoChat: {
    flexDirection: 'row', backgroundColor: cores.azul, borderRadius: raio.md,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  botaoChatSolicitar: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.azul },
  botaoChatPendente: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.aviso },
  botaoChatHistorico: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.cardBorda },
  botaoChatDesabilitado: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.cardBorda },
  botaoChatTexto: { color: '#fff', fontSize: 15, fontFamily: fontInter.bold },

  conviteCard: { ...comum.card },
  convitePergunta: { color: cores.texto, fontSize: 14, marginBottom: 12 },
  conviteBotoes: { flexDirection: 'row', gap: 10 },
  botaoConvite: { flex: 1, paddingVertical: 12, borderRadius: raio.sm, alignItems: 'center' },
  botaoRecusar: { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.erro },
  botaoAceitar: { backgroundColor: cores.azul },
  botaoConviteTexto: { color: '#fff', fontSize: 14, fontFamily: fontInter.bold },

  avaliacaoCard: { ...comum.card, marginBottom: espaco.lg },
  avaliacaoPrompt: {
    ...comum.card, marginBottom: espaco.lg,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avaliacaoPromptSeta: { color: cores.azulClaro, fontSize: 24, fontFamily: fontInter.bold },
  avaliacaoTitulo: { color: cores.texto, fontSize: 15, fontFamily: fontInter.bold, marginBottom: 4 },
  avaliacaoSubtitulo: { color: cores.textoSecundario, fontSize: 13 },
  avaliacaoComentarioTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 12 },
  avaliacaoData: { color: cores.textoTerciario, fontSize: 11, marginTop: 10 },

  secaoTitulo: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 8,
  },
  descricao: { color: cores.texto, fontSize: 15, lineHeight: 22 },
  vazioTexto: { color: cores.textoTerciario, fontSize: 14 },

  comentario: { ...comum.card, marginBottom: 10 },
  comentarioTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  comentarioAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: cores.cardBorda,
    justifyContent: 'center', alignItems: 'center',
  },
  comentarioAvatarTexto: { color: cores.textoSecundario, fontSize: 10, fontFamily: fontInter.bold },
  comentarioAutor: { color: cores.texto, fontFamily: fontInter.bold, fontSize: 13 },
  comentarioPerfil: { color: cores.textoTerciario, fontWeight: '400' },
  comentarioTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
  comentarioData: { color: cores.textoTerciario, fontSize: 11, marginTop: 1 },

  inputArea: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1,
    borderTopColor: cores.cardBorda, backgroundColor: cores.fundo, gap: 8,
  },
  inputComentario: { flex: 1, ...comum.input, paddingVertical: 10 },
  botaoEnviar: {
    backgroundColor: cores.azul, borderRadius: raio.sm,
    width: 44, justifyContent: 'center', alignItems: 'center',
  },
  botaoEnviarTexto: { color: '#fff', fontSize: 20, fontFamily: fontInter.bold },
});
