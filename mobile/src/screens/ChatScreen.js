import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { conectarSocket } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

const PERFIL_ABREV = { TECNICO: 'TI', ADMIN: 'TI', USUARIO: '' };

export default function ChatScreen({ route, navigation }) {
  const { sessaoId, chamadoTitulo, contato, isTecnico } = route.params;
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [conectando, setConectando] = useState(true);
  const [encerrado, setEncerrado] = useState(false);
  const [encerradoPorResolucao, setEncerradoPorResolucao] = useState(false);
  const [contatoOnline, setContatoOnline] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function iniciarChat() {
      try {
        const socket = await conectarSocket();
        socketRef.current = socket;

        socket.emit('entrar_chat', { sessaoId });

        socket.on('historico_chat', ({ mensagens: hist, somenteLeitura: leitura, encerradoPorResolucao: porResolucao, contatoOnline: online }) => {
          if (!mounted) return;
          setMensagens(hist);
          setConectando(false);
          setContatoOnline(!!online);
          if (leitura) {
            setEncerrado(true);
            setEncerradoPorResolucao(!!porResolucao);
          }
        });

        socket.on('nova_mensagem', (msg) => {
          if (mounted) setMensagens((prev) => [...prev, msg]);
        });

        socket.on('chat_encerrado', ({ encerradoPorResolucao: porResolucao } = {}) => {
          if (mounted) {
            setEncerrado(true);
            setEncerradoPorResolucao(!!porResolucao);
            if (!porResolucao) Alert.alert('Chat encerrado', 'O técnico encerrou esta conversa.');
          }
        });

        socket.on('usuario_status', ({ usuarioId, online }) => {
          if (mounted && contato?.id === usuarioId) setContatoOnline(online);
        });

        socket.on('erro', ({ mensagem }) => {
          if (mounted) Alert.alert('Erro', mensagem);
        });
      } catch {
        if (mounted) Alert.alert('Erro', 'Não foi possível conectar ao chat.');
      }
    }

    iniciarChat();

    return () => {
      mounted = false;
      const s = socketRef.current;
      if (s) {
        s.off('historico_chat');
        s.off('nova_mensagem');
        s.off('chat_encerrado');
        s.off('usuario_status');
        s.off('erro');
      }
    };
  }, [sessaoId]);

  function enviarMensagem() {
    if (!texto.trim() || encerrado) return;
    socketRef.current?.emit('mensagem', { sessaoId, texto });
    setTexto('');
    flatListRef.current?.scrollToEnd({ animated: true });
  }

  function handleEncerrar() {
    Alert.alert('Encerrar chat?', 'O usuário não poderá mais enviar mensagens.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar', style: 'destructive',
        onPress: () => {
          socketRef.current?.emit('encerrar_chat', { sessaoId });
          navigation.goBack();
        },
      },
    ]);
  }

  function renderMensagem({ item }) {
    const minha = item.autor.id === usuario.id;
    const abrev = PERFIL_ABREV[item.autor.perfil];
    return (
      <View style={[styles.bolhaWrap, minha ? styles.bolhaWrapMinha : styles.bolhaWrapOutra]}>
        {!minha && (
          <Text style={styles.bolhaAutor}>
            {item.autor.nome}{abrev ? ` · ${abrev}` : ''}
          </Text>
        )}
        <View style={[styles.bolha, minha ? styles.bolhaMinha : styles.bolhaOutra]}>
          <Text style={[styles.bolhaTexto, minha && styles.bolhaTextoMinha]}>{item.texto}</Text>
          <Text style={[styles.bolhaHora, minha && styles.bolhaHoraMinha]}>
            {new Date(item.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }

  if (conectando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#2d6fff" />
        <Text style={styles.conectandoTexto}>Conectando ao chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltarBotao} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.voltarSeta}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerNome}>{contato?.nome || 'Chat'}</Text>
          <View style={styles.statusLinha}>
            {!encerrado && (
              <>
                <View style={[styles.statusPonto, { backgroundColor: contatoOnline ? '#22c55e' : '#555' }]} />
                <Text style={styles.statusTexto}>{contatoOnline ? 'Online' : 'Offline'}</Text>
                <Text style={styles.statusSeparador}> · </Text>
              </>
            )}
            <Text style={styles.headerChamado} numberOfLines={1}>{chamadoTitulo}</Text>
          </View>
        </View>

        {isTecnico && !encerrado && (
          <TouchableOpacity style={styles.botaoEncerrar} onPress={handleEncerrar}>
            <Text style={styles.botaoEncerrarTexto}>Encerrar</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={mensagens}
        keyExtractor={(item) => item.id}
        renderItem={renderMensagem}
        contentContainerStyle={styles.listaMensagens}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={styles.pillWrap}>
            <View style={styles.pill}>
              <Text style={styles.pillTexto}>
                {encerrado ? 'Conversa encerrada' : 'Chat liberado após aceite mútuo'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.vazioTexto}>Nenhuma mensagem ainda. Diga olá! 👋</Text>}
      />

      {encerrado ? (
        <View style={styles.encerradoBanner}>
          <Text style={styles.encerradoTexto}>
            {encerradoPorResolucao
              ? '📄 Histórico do chamado resolvido — somente leitura'
              : 'Este chat foi encerrado'}
          </Text>
        </View>
      ) : (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Digite uma mensagem..."
            placeholderTextColor="#666"
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={enviarMensagem}
            returnKeyType="send"
          />
          <TouchableOpacity style={[styles.botaoEnviar, !texto.trim() && { opacity: 0.4 }]} onPress={enviarMensagem} disabled={!texto.trim()}>
            <Text style={styles.botaoEnviarTexto}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c14' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0c14', gap: 12 },
  conectandoTexto: { color: '#888', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1e212c', backgroundColor: '#0a0c14',
  },
  voltarBotao: { paddingRight: 2 },
  voltarSeta: { color: '#fff', fontSize: 22 },
  headerInfo: { flex: 1 },
  headerNome: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusLinha: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusPonto: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusTexto: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  statusSeparador: { color: '#555', fontSize: 12 },
  headerChamado: { color: '#777', fontSize: 12, flexShrink: 1 },

  botaoEncerrar: { backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  botaoEncerrarTexto: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  listaMensagens: { padding: 16, paddingBottom: 8 },
  pillWrap: { alignItems: 'center', marginBottom: 16 },
  pill: { backgroundColor: '#151824', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  pillTexto: { color: '#888', fontSize: 12 },

  bolhaWrap: { maxWidth: '78%', marginBottom: 14 },
  bolhaWrapMinha: { alignSelf: 'flex-end' },
  bolhaWrapOutra: { alignSelf: 'flex-start' },
  bolhaAutor: { color: '#5b8cff', fontSize: 12, fontWeight: '700', marginBottom: 5, marginLeft: 2 },
  bolha: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bolhaMinha: { backgroundColor: '#2d6fff', borderBottomRightRadius: 4 },
  bolhaOutra: { backgroundColor: '#151824', borderBottomLeftRadius: 4 },
  bolhaTexto: { color: '#d8dae0', fontSize: 15, lineHeight: 21 },
  bolhaTextoMinha: { color: '#fff' },
  bolhaHora: { color: '#666', fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
  bolhaHoraMinha: { color: '#ffffff99' },

  vazioTexto: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },

  inputArea: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1e212c', backgroundColor: '#0a0c14',
  },
  input: {
    flex: 1, backgroundColor: '#151824', borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12, color: '#fff', fontSize: 15,
  },
  botaoEnviar: { backgroundColor: '#2d6fff', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  botaoEnviarTexto: { color: '#fff', fontSize: 17 },

  encerradoBanner: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1e212c', backgroundColor: '#0d0f18' },
  encerradoTexto: { color: '#888', fontSize: 14 },
});
