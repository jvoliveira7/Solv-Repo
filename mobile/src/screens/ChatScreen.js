import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { conectarSocket } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

export default function ChatScreen({ route, navigation }) {
  const { sessaoId, chamadoTitulo, contato, isTecnico } = route.params;
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [conectando, setConectando] = useState(true);
  const [encerrado, setEncerrado] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function iniciarChat() {
      try {
        const socket = await conectarSocket();
        socketRef.current = socket;

        socket.emit('entrar_chat', { sessaoId });

        socket.on('historico_chat', ({ mensagens: hist }) => {
          if (mounted) { setMensagens(hist); setConectando(false); }
        });

        socket.on('nova_mensagem', (msg) => {
          if (mounted) setMensagens((prev) => [...prev, msg]);
        });

        socket.on('chat_encerrado', () => {
          if (mounted) {
            setEncerrado(true);
            Alert.alert('Chat encerrado', 'O técnico encerrou esta conversa.');
          }
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
    return (
      <View style={[styles.bolha, minha ? styles.bolhaMinha : styles.bolhaOutra]}>
        {!minha && <Text style={styles.bolhaAutor}>{item.autor.nome}</Text>}
        <Text style={[styles.bolhaTexto, minha && styles.bolhaTextoMinha]}>{item.texto}</Text>
        <Text style={[styles.bolhaHora, minha && styles.bolhaHoraMinha]}>
          {new Date(item.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
        <View>
          <Text style={styles.headerNome}>{contato?.nome || 'Chat'}</Text>
          <Text style={styles.headerChamado} numberOfLines={1}>{chamadoTitulo}</Text>
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
        ListEmptyComponent={<Text style={styles.vazioTexto}>Nenhuma mensagem ainda. Diga olá! 👋</Text>}
      />

      {encerrado ? (
        <View style={styles.encerradoBanner}>
          <Text style={styles.encerradoTexto}>Este chat foi encerrado</Text>
        </View>
      ) : (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Digite uma mensagem..."
            placeholderTextColor="#555"
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={enviarMensagem}
            returnKeyType="send"
          />
          <TouchableOpacity style={[styles.botaoEnviar, !texto.trim() && { opacity: 0.4 }]} onPress={enviarMensagem} disabled={!texto.trim()}>
            <Text style={styles.botaoEnviarTexto}>↑</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117', gap: 12 },
  conectandoTexto: { color: '#888', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2d3a', backgroundColor: '#0f1117' },
  headerNome: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerChamado: { color: '#888', fontSize: 12, marginTop: 2, maxWidth: 220 },
  botaoEncerrar: { backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  botaoEncerrarTexto: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  listaMensagens: { padding: 16, gap: 8, paddingBottom: 8 },
  bolha: { maxWidth: '75%', borderRadius: 14, padding: 12, marginBottom: 4 },
  bolhaMinha: { backgroundColor: '#2d6fff', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bolhaOutra: { backgroundColor: '#1a1d27', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#2a2d3a' },
  bolhaAutor: { color: '#2d6fff', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bolhaTexto: { color: '#ccc', fontSize: 15, lineHeight: 20 },
  bolhaTextoMinha: { color: '#fff' },
  bolhaHora: { color: '#888', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bolhaHoraMinha: { color: '#ffffff88' },
  vazioTexto: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },
  inputArea: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#2a2d3a', backgroundColor: '#0f1117' },
  input: { flex: 1, backgroundColor: '#1a1d27', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2d3a' },
  botaoEnviar: { backgroundColor: '#2d6fff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  botaoEnviarTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  encerradoBanner: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2a2d3a', backgroundColor: '#1a1d27' },
  encerradoTexto: { color: '#888', fontSize: 14 },
});
