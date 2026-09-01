import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../../services/api';
import { useChatSessao } from '../../hooks/useChatSessao';
import { cores, espaco, raio, comum, statusCor, statusLabel, prioridadeCor } from '../../theme';
import { tempoRelativo } from '../../utils/tempoRelativo';

const PROXIMOS_STATUS = {
  ABERTO: ['EM_ATENDIMENTO'],
  EM_ATENDIMENTO: ['AGUARDANDO', 'RESOLVIDO'],
  AGUARDANDO: ['EM_ATENDIMENTO', 'RESOLVIDO'],
  RESOLVIDO: ['FECHADO'],
  FECHADO: [],
};

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function DetalheChamadoTecnicoScreen({ route, navigation }) {
  const { id } = route.params;
  const [chamado, setChamado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [anotacao, setAnotacao] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const { sessao: sessaoChat, convidar, aceitar, recusar } = useChatSessao(id);

  async function carregarChamado() {
    try {
      const { data } = await api.get(`/chamados/${id}`);
      setChamado(data);
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

  function handleAceitarConvite() {
    aceitar();
    navigation.navigate('Chat', {
      sessaoId: sessaoChat.id,
      chamadoTitulo: chamado.titulo,
      contato: chamado.solicitante,
      isTecnico: true,
    });
  }

  function handleAbrirChatDireto() {
    // Técnico abre chat direto (RN16). A sessão nasce ATIVA no backend;
    // navegamos assim que a store confirmar o id da sessão.
    convidar();
  }

  // Quando o chat direto do técnico é confirmado (sessão vira ATIVA e ganha
  // id), navega automaticamente pra conversa.
  const [abrindoDireto, setAbrindoDireto] = useState(false);
  useEffect(() => {
    if (abrindoDireto && sessaoChat?.status === 'ATIVA' && sessaoChat?.id) {
      setAbrindoDireto(false);
      navigation.navigate('Chat', {
        sessaoId: sessaoChat.id,
        chamadoTitulo: chamado.titulo,
        contato: chamado.solicitante,
        isTecnico: true,
      });
    }
  }, [abrindoDireto, sessaoChat?.status, sessaoChat?.id]);

  async function handleAtualizarStatus(novoStatus) {
    setAtualizando(true);
    try {
      await api.patch(`/chamados/${id}/status`, {
        status: novoStatus,
        anotacao: anotacao.trim() || undefined,
      });
      setAnotacao('');
      carregarChamado();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Erro ao atualizar status.');
    } finally {
      setAtualizando(false);
    }
  }

  function confirmarStatus(novoStatus) {
    Alert.alert(
      `Mover para "${statusLabel[novoStatus]}"?`,
      anotacao ? `Anotação: "${anotacao}"` : 'Sem anotação.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => handleAtualizarStatus(novoStatus) },
      ]
    );
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  if (!chamado) return null;

  const proximosStatus = PROXIMOS_STATUS[chamado.status] || [];
  const chatAtivo = sessaoChat?.status === 'ATIVA';
  const chatPendente = sessaoChat?.status === 'PENDENTE';
  const chatHistorico = sessaoChat?.status === 'ENCERRADA';
  const podeConvidarChat = !sessaoChat?.status || chatHistorico;
  const convitePendenteRecebido = chatPendente && sessaoChat.iniciadoPor === 'USUARIO';

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
            <View style={styles.metaLinha}>
              <View style={styles.metaAvatar}>
                <Text style={styles.metaAvatarTexto}>{iniciais(chamado.solicitante.nome)}</Text>
              </View>
              <Text style={styles.metaTexto}>{chamado.solicitante.nome} · {chamado.solicitante.setor}</Text>
            </View>
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
        {chatAtivo && (
          <TouchableOpacity
            style={styles.botaoChat}
            onPress={() => navigation.navigate('Chat', {
              sessaoId: sessaoChat.id,
              chamadoTitulo: chamado.titulo,
              contato: chamado.solicitante,
              isTecnico: true,
            })}
          >
            <Text style={styles.botaoChatTexto}>💬 Chat ativo — abrir conversa</Text>
          </TouchableOpacity>
        )}

        {convitePendenteRecebido && (
          <View style={styles.conviteCard}>
            <Text style={styles.convitePergunta}>
              💬 {chamado.solicitante.nome} quer conversar sobre este chamado.
            </Text>
            <View style={styles.conviteBotoes}>
              <TouchableOpacity style={[styles.botaoConvite, styles.botaoRecusar]} onPress={recusar}>
                <Text style={styles.botaoConviteTexto}>Recusar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoConvite, styles.botaoAceitar]} onPress={handleAceitarConvite}>
                <Text style={styles.botaoConviteTexto}>Aceitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {chatHistorico && (
          <TouchableOpacity
            style={[styles.botaoChat, styles.botaoChatHistorico]}
            onPress={() => navigation.navigate('Chat', {
              sessaoId: sessaoChat.id,
              chamadoTitulo: chamado.titulo,
              contato: chamado.solicitante,
              isTecnico: true,
            })}
          >
            <Text style={[styles.botaoChatTexto, { color: cores.textoSecundario }]}>📄 Ver histórico do chat</Text>
          </TouchableOpacity>
        )}

        {podeConvidarChat && chamado.status === 'EM_ATENDIMENTO' && (
          <TouchableOpacity
            style={[styles.botaoChat, styles.botaoChatConvidar]}
            onPress={() => { setAbrindoDireto(true); handleAbrirChatDireto(); }}
          >
            <Text style={[styles.botaoChatTexto, { color: cores.azulClaro }]}>💬 Abrir chat com o usuário</Text>
          </TouchableOpacity>
        )}

        {podeConvidarChat && chamado.status !== 'EM_ATENDIMENTO' && chamado.status !== 'FECHADO' && (
          <View style={[styles.botaoChat, styles.botaoChatDesabilitado]}>
            <Text style={[styles.botaoChatTexto, { color: cores.textoTerciario }]}>
              💬 Assuma o chamado ("Em atendimento") para poder abrir o chat
            </Text>
          </View>
        )}

        {/* Descrição */}
        <Text style={styles.secaoTitulo}>Descrição</Text>
        <View style={comum.card}>
          <Text style={styles.descricao}>{chamado.descricao}</Text>
        </View>

        {/* Histórico */}
        <Text style={styles.secaoTitulo}>Histórico ({chamado.comentarios.length})</Text>
        {chamado.comentarios.length === 0 && (
          <Text style={styles.vazioTexto}>Nenhuma anotação ainda.</Text>
        )}
        {chamado.comentarios.map((c) => (
          <View key={c.id} style={styles.comentario}>
            <View style={styles.comentarioTopo}>
              <View style={styles.comentarioAvatar}>
                <Text style={styles.comentarioAvatarTexto}>{iniciais(c.autor.nome)}</Text>
              </View>
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

        {/* Ações */}
        {proximosStatus.length > 0 && (
          <>
            <Text style={styles.secaoTitulo}>Anotação (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Registre o que foi feito ou observado..."
              placeholderTextColor={cores.placeholder}
              multiline
              value={anotacao}
              onChangeText={setAnotacao}
            />
            <Text style={styles.secaoTitulo}>Mover para</Text>
            <View style={styles.acoesRow}>
              {proximosStatus.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.botaoAcao, { borderColor: statusCor[status], backgroundColor: statusCor[status] + '22' }]}
                  onPress={() => confirmarStatus(status)}
                  disabled={atualizando}
                >
                  {atualizando
                    ? <ActivityIndicator color={statusCor[status]} size="small" />
                    : <Text style={[styles.botaoAcaoTexto, { color: statusCor[status] }]}>
                        {statusLabel[status]}
                      </Text>
                  }
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo },
  content: { padding: espaco.xl, paddingBottom: 40 },

  hero: { ...comum.card, marginBottom: espaco.lg },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.sm, marginBottom: 12 },
  statusBadgeTexto: { fontSize: 11, fontWeight: '700' },
  titulo: { color: cores.texto, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  chipsLinha: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: raio.sm },
  chipTexto: { color: cores.textoSecundario, fontSize: 11, fontWeight: '700' },

  metaLista: { gap: 8, borderTopWidth: 1, borderTopColor: cores.cardBorda, paddingTop: 12 },
  metaLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaIcone: { fontSize: 13, width: 20 },
  metaAvatar: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: cores.roxo,
    justifyContent: 'center', alignItems: 'center',
  },
  metaAvatarTexto: { color: '#fff', fontSize: 9, fontWeight: '700' },
  metaTexto: { color: cores.textoSecundario, fontSize: 13 },

  botaoChat: {
    backgroundColor: cores.card, borderWidth: 1, borderColor: cores.azul,
    borderRadius: raio.md, paddingVertical: 14, alignItems: 'center', marginBottom: espaco.lg,
  },
  botaoChatTexto: { color: cores.azulClaro, fontSize: 15, fontWeight: '700' },
  botaoChatPendente: { borderColor: cores.aviso },
  botaoChatHistorico: { borderColor: cores.cardBorda },
  botaoChatConvidar: { borderColor: cores.azul },
  botaoChatDesabilitado: { borderColor: cores.cardBorda },

  conviteCard: { ...comum.card, marginBottom: espaco.lg },
  convitePergunta: { color: cores.texto, fontSize: 14, marginBottom: 12 },
  conviteBotoes: { flexDirection: 'row', gap: 10 },
  botaoConvite: { flex: 1, paddingVertical: 12, borderRadius: raio.sm, alignItems: 'center' },
  botaoRecusar: { backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.erro },
  botaoAceitar: { backgroundColor: cores.azul },
  botaoConviteTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },

  secaoTitulo: {
    color: cores.textoSecundario, fontSize: 11, fontWeight: '700',
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
  comentarioAvatarTexto: { color: cores.textoSecundario, fontSize: 10, fontWeight: '700' },
  comentarioAutor: { color: cores.texto, fontWeight: '700', fontSize: 13 },
  comentarioPerfil: { color: cores.textoTerciario, fontWeight: '400' },
  comentarioTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
  comentarioData: { color: cores.textoTerciario, fontSize: 11, marginTop: 1 },

  input: { ...comum.input, marginBottom: espaco.lg },
  acoesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  botaoAcao: {
    flex: 1, paddingVertical: 14, borderRadius: raio.md,
    borderWidth: 1, alignItems: 'center',
  },
  botaoAcaoTexto: { fontWeight: 'bold', fontSize: 14 },
});
