import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco, raio, comum, fontInter } from '../theme';

export const MOTIVOS_DENUNCIA = [
  { valor: 'COMPORTAMENTO', label: 'Comportamento', descricao: 'Grosseria, desrespeito ou conduta inadequada' },
  { valor: 'RESPONSABILIDADE', label: 'Responsabilidade', descricao: 'Abandonou o chamado, não cumpriu o combinado' },
  { valor: 'OUTRO', label: 'Outro', descricao: 'Algo que não se encaixa nas opções acima' },
];

export default function DenunciaModal({ visible, tecnico, enviando, onEnviar, onFechar }) {
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState(null);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (visible) {
      setMotivo(null);
      setDescricao('');
    }
  }, [visible]);

  const podeEnviar = !!motivo && descricao.trim().length >= 10 && !enviando;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView
        style={styles.fundo}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.caixa, { paddingBottom: insets.bottom + espaco.lg }]}>
          <Text style={styles.titulo}>Denunciar atendimento</Text>
          <Text style={styles.subtitulo}>
            {tecnico?.nome ? `Você está denunciando ${tecnico.nome}. ` : ''}
            Um administrador vai analisar o que você relatar.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
            <Text style={styles.label}>O que aconteceu?</Text>
            {MOTIVOS_DENUNCIA.map((m) => {
              const ativo = motivo === m.valor;
              return (
                <TouchableOpacity
                  key={m.valor}
                  style={[styles.opcao, ativo && styles.opcaoAtiva]}
                  onPress={() => setMotivo(m.valor)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.opcaoTitulo, ativo && { color: cores.azulClaro }]}>{m.label}</Text>
                  <Text style={styles.opcaoDescricao}>{m.descricao}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>Conte o ocorrido</Text>
            <TextInput
              style={[comum.input, styles.campoDescricao]}
              placeholder="Descreva o que aconteceu (mín. 10 caracteres)"
              placeholderTextColor={cores.placeholder}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              textAlignVertical="top"
              maxLength={600}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.botaoEnviar, !podeEnviar && { opacity: 0.4 }]}
            onPress={() => onEnviar(motivo, descricao.trim())}
            disabled={!podeEnviar}
          >
            {enviando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.botaoEnviarTexto}>Enviar denúncia</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoCancelar} onPress={onFechar} disabled={enviando}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  caixa: {
    backgroundColor: cores.card, borderTopLeftRadius: raio.xl, borderTopRightRadius: raio.xl,
    padding: espaco.xl,
  },
  titulo: { color: cores.texto, fontSize: 18, fontFamily: fontInter.extrabold },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 6 },
  label: {
    color: cores.textoSecundario, fontSize: 11, fontFamily: fontInter.bold,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  opcao: {
    borderWidth: 1, borderColor: cores.cardBorda, borderRadius: raio.md,
    paddingVertical: 11, paddingHorizontal: 14, marginBottom: 8, backgroundColor: cores.fundo,
  },
  opcaoAtiva: { borderColor: cores.azul, backgroundColor: cores.azulSuave },
  opcaoTitulo: { color: cores.texto, fontSize: 14, fontFamily: fontInter.semibold },
  opcaoDescricao: { color: cores.textoTerciario, fontSize: 12, marginTop: 2 },
  campoDescricao: { minHeight: 96, backgroundColor: cores.fundo },
  botaoEnviar: { ...comum.botaoPrimario, backgroundColor: cores.erro, marginTop: espaco.lg },
  botaoEnviarTexto: { ...comum.botaoPrimarioTexto },
  botaoCancelar: { alignItems: 'center', paddingVertical: 12 },
  botaoCancelarTexto: { color: cores.textoSecundario, fontSize: 15, fontFamily: fontInter.semibold },
});
