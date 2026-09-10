import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, Animated,
  ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, PanResponder,
} from 'react-native';
import { cores, espaco, raio, comum, fontInter } from '../theme';
import Avatar from './Avatar';

const ALTURA_TELA = Dimensions.get('window').height;
const MOLA = { friction: 8, tension: 60, useNativeDriver: true };
const PADDING_INFERIOR = Platform.OS === 'ios' ? 28 : espaco.lg;

// Estrela individual: um ☆ de base sempre visível e um ★ dourado que aparece
// por cima com fade + "pop" de escala. `atraso` escalona a animação estrela
// a estrela (efeito de preenchimento em sequência, não tudo de uma vez).
function Estrela({ ativa, atraso, tamanho, onPress }) {
  const escala = useRef(new Animated.Value(1)).current;
  const preenchimento = useRef(new Animated.Value(ativa ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(preenchimento, {
      toValue: ativa ? 1 : 0,
      duration: 160,
      delay: atraso,
      useNativeDriver: true,
    }).start();

    if (ativa) {
      Animated.sequence([
        Animated.delay(atraso),
        Animated.spring(escala, { toValue: 1.3, friction: 4, tension: 300, useNativeDriver: true }),
        Animated.spring(escala, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa]);

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Animated.View style={[styles.estrelaBox, { width: tamanho, height: tamanho, transform: [{ scale: escala }] }]}>
        <Text style={[styles.estrelaGlifo, { fontSize: tamanho, color: cores.cardBorda }]}>☆</Text>
        <Animated.Text style={[styles.estrelaGlifo, styles.estrelaPreenchida, { fontSize: tamanho, opacity: preenchimento }]}>
          ★
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function EstrelasAnimadas({ valor, onMudar, tamanho = 40, gap = 12 }) {
  return (
    <View style={[styles.estrelasLinha, { gap }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Estrela key={n} ativa={n <= valor} atraso={(n - 1) * 45} tamanho={tamanho} onPress={() => onMudar(n)} />
      ))}
    </View>
  );
}

// Modal de avaliação em formato bottom-sheet (estilo "fim de corrida"):
// sobe com animação de mola, arrasta pra fechar pela alça, estrelas animam
// preenchendo em sequência ao tocar. Sempre controlado por `visible` — o
// componente cuida da animação de entrada/saída sozinho.
export default function AvaliacaoModal({ visible, tecnico, enviando, onEnviar, onFechar }) {
  const [montado, setMontado] = useState(visible);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const translateY = useRef(new Animated.Value(ALTURA_TELA)).current;
  const overlay = useRef(new Animated.Value(0)).current;
  const enviandoRef = useRef(enviando);
  enviandoRef.current = enviando;

  function fechar() {
    if (enviandoRef.current) return;
    onFechar?.();
  }

  useEffect(() => {
    if (visible) {
      setNota(0);
      setComentario('');
      setMontado(true);
      translateY.setValue(ALTURA_TELA);
      Animated.spring(translateY, { toValue: 0, ...MOLA }).start();
      Animated.timing(overlay, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(overlay, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      Animated.timing(translateY, { toValue: ALTURA_TELA, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMontado(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !enviandoRef.current,
      onMoveShouldSetPanResponder: (_, gesto) => !enviandoRef.current && Math.abs(gesto.dy) > 4,
      onPanResponderMove: (_, gesto) => {
        if (gesto.dy > 0) translateY.setValue(gesto.dy);
      },
      onPanResponderRelease: (_, gesto) => {
        if (gesto.dy > 120 || gesto.vy > 0.8) {
          Animated.timing(translateY, { toValue: ALTURA_TELA, duration: 200, useNativeDriver: true }).start();
          Animated.timing(overlay, { toValue: 0, duration: 200, useNativeDriver: true }).start();
          fechar();
        } else {
          Animated.spring(translateY, { toValue: 0, ...MOLA }).start();
        }
      },
    })
  ).current;

  if (!montado) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={fechar}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.overlay, { opacity: overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={fechar} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.wrapperFolha}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.folha, { paddingBottom: PADDING_INFERIOR, transform: [{ translateY }] }]}>
            <View {...panResponder.panHandlers} style={styles.alcaArea}>
              <View style={styles.alca} />
            </View>

            <View style={styles.cabecalho}>
              {tecnico && <Avatar uri={tecnico.avatar} nome={tecnico.nome} size={44} cor={cores.azul} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>Como foi o atendimento?</Text>
                {tecnico && <Text style={styles.subtitulo}>Avalie {tecnico.nome}</Text>}
              </View>
            </View>

            <View style={styles.estrelasArea}>
              <EstrelasAnimadas valor={nota} onMudar={setNota} />
            </View>

            <TextInput
              style={[comum.input, styles.comentarioInput]}
              placeholder="Comentário (opcional)"
              placeholderTextColor={cores.placeholder}
              multiline
              value={comentario}
              onChangeText={setComentario}
            />

            <Pressable
              style={[styles.botaoEnviar, (nota < 1 || enviando) && { opacity: 0.5 }]}
              onPress={() => onEnviar(nota, comentario)}
              disabled={nota < 1 || enviando}
            >
              {enviando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.botaoEnviarTexto}>Enviar avaliação</Text>}
            </Pressable>

            <Pressable onPress={fechar} disabled={enviando} hitSlop={8}>
              <Text style={styles.agoraNao}>Agora não</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  wrapperFolha: { flex: 1, justifyContent: 'flex-end' },
  folha: {
    backgroundColor: cores.card,
    borderTopLeftRadius: raio.xl,
    borderTopRightRadius: raio.xl,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderBottomWidth: 0,
    paddingHorizontal: espaco.xl,
  },
  alcaArea: { alignItems: 'center', paddingVertical: 12 },
  alca: { width: 40, height: 4, borderRadius: 2, backgroundColor: cores.cardBorda },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: espaco.xl },
  titulo: { color: cores.texto, fontSize: 18, fontFamily: fontInter.extrabold },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  estrelasArea: { alignItems: 'center', marginBottom: espaco.xl },
  estrelasLinha: { flexDirection: 'row', alignItems: 'center' },
  estrelaBox: { justifyContent: 'center', alignItems: 'center' },
  estrelaGlifo: { position: 'absolute' },
  estrelaPreenchida: { color: '#f5c518' },
  comentarioInput: { height: 80, textAlignVertical: 'top', marginBottom: espaco.lg },
  botaoEnviar: {
    backgroundColor: cores.azul, borderRadius: raio.md,
    paddingVertical: 15, alignItems: 'center', marginBottom: espaco.md,
  },
  botaoEnviarTexto: { color: '#fff', fontSize: 15, fontFamily: fontInter.bold },
  agoraNao: { color: cores.textoTerciario, fontSize: 13, textAlign: 'center', fontFamily: fontInter.medium, marginBottom: espaco.sm },
});
