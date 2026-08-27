import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated,
} from 'react-native';
import { FLUXO_GUIADO } from '../../utils/fluxoGuiado';

export default function GuidedModeScreen({ navigation }) {
  const [historico, setHistorico] = useState(['inicio']);
  const etapaAtual = FLUXO_GUIADO[historico[historico.length - 1]];

  function avancar(proximoId) {
    setHistorico([...historico, proximoId]);
  }

  function voltar() {
    if (historico.length > 1) {
      setHistorico(historico.slice(0, -1));
    }
  }

  function reiniciar() {
    setHistorico(['inicio']);
  }

  // Se chegou num resultado final
  if (etapaAtual?.resultado) {
    return (
      <ConfirmacaoChamado
        resultado={etapaAtual.resultado}
        historico={historico}
        onVoltar={voltar}
        onReiniciar={reiniciar}
        navigation={navigation}
      />
    );
  }

  const progresso = historico.length - 1; // quantas perguntas já respondidas

  return (
    <View style={styles.container}>
      {/* Header com progresso */}
      <View style={styles.header}>
        {historico.length > 1 && (
          <TouchableOpacity onPress={voltar} style={styles.botaoVoltar}>
            <Text style={styles.botaoVoltarTexto}>← Voltar</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressoContainer}>
          {[...Array(progresso)].map((_, i) => (
            <View key={i} style={[styles.progressoDot, styles.progressoDotAtivo]} />
          ))}
          <View style={[styles.progressoDot, styles.progressoDotAtual]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Ícone e pergunta */}
        <View style={styles.perguntaContainer}>
          <Text style={styles.label}>Modo Guiado</Text>
          <Text style={styles.pergunta}>{etapaAtual.pergunta}</Text>
        </View>

        {/* Opções */}
        <View style={styles.opcoes}>
          {etapaAtual.opcoes.map((opcao, index) => (
            <TouchableOpacity
              key={index}
              style={styles.opcao}
              onPress={() => avancar(opcao.proximoId)}
              activeOpacity={0.7}
            >
              <Text style={styles.opcaoTexto}>{opcao.label}</Text>
              <Text style={styles.opcaoSeta}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ConfirmacaoChamado({ resultado, onVoltar, onReiniciar, navigation }) {
  const [localizacao, setLocalizacao] = useState('');
  const [enviando, setEnviando] = useState(false);

  const PRIORIDADE_COR = {
    BAIXA: '#10b981', MEDIA: '#f59e0b', ALTA: '#ef4444', CRITICA: '#7c3aed',
  };

  async function handleAbrir() {
    setEnviando(true);
    try {
      const api = (await import('../../services/api')).default;
      await api.post('/chamados', {
        titulo: resultado.titulo,
        descricao: resultado.descricao,
        categoria: resultado.categoria,
        prioridade: resultado.prioridade,
        localizacao: localizacao.trim() || undefined,
      });

      navigation.navigate('HomeTab', {
        screen: 'Home',
        params: { chamadoAberto: true },
      });
      onReiniciar();
    } catch (err) {
      const { Alert } = await import('react-native');
      Alert.alert('Erro', 'Não foi possível abrir o chamado.');
    } finally {
      setEnviando(false);
    }
  }

  const { TextInput, Alert } = require('react-native');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Modo Guiado</Text>
        <Text style={styles.confirmacaoTitulo}>Confirme seu chamado</Text>
        <Text style={styles.confirmacaoSubtitulo}>
          Com base nas suas respostas, montamos o chamado abaixo:
        </Text>

        {/* Card do chamado gerado */}
        <View style={styles.chamadoCard}>
          <Text style={styles.chamadoTitulo}>{resultado.titulo}</Text>

          <View style={styles.chamadoMeta}>
            <View style={[styles.badge, { backgroundColor: '#2d6fff22' }]}>
              <Text style={[styles.badgeTexto, { color: '#2d6fff' }]}>{resultado.categoria}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: PRIORIDADE_COR[resultado.prioridade] + '22' }]}>
              <Text style={[styles.badgeTexto, { color: PRIORIDADE_COR[resultado.prioridade] }]}>
                {resultado.prioridade}
              </Text>
            </View>
          </View>

          <Text style={styles.chamadoDescricao}>{resultado.descricao}</Text>
        </View>

        {/* Localização opcional */}
        <Text style={styles.localizacaoLabel}>Onde você está? (opcional)</Text>
        <TextInput
          style={styles.localizacaoInput}
          placeholder="Ex: Secretaria de Educação, Sala 3"
          placeholderTextColor="#555"
          value={localizacao}
          onChangeText={setLocalizacao}
        />

        {/* Ações */}
        <TouchableOpacity
          style={[styles.botaoAbrir, enviando && { opacity: 0.6 }]}
          onPress={handleAbrir}
          disabled={enviando}
          
        >
          <Text style={styles.botaoAbrirTexto}>
            {enviando ? 'Abrindo chamado...' : '✓ Abrir este chamado'}
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoVoltar2} onPress={onVoltar}>
          <Text style={styles.botaoVoltar2Texto}>← Voltar e corrigir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoReiniciar} onPress={onReiniciar}>
          <Text style={styles.botaoReiniciarTexto}>↺ Recomeçar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  botaoVoltar: { paddingVertical: 4 },
  botaoVoltarTexto: { color: '#2d6fff', fontSize: 15 },
  progressoContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progressoDot: { width: 8, height: 8, borderRadius: 4 },
  progressoDotAtivo: { backgroundColor: '#2d6fff' },
  progressoDotAtual: { backgroundColor: '#2d6fff44', width: 10, height: 10, borderRadius: 5 },
  content: { padding: 20, paddingBottom: 40 },
  label: { color: '#2d6fff', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  perguntaContainer: { marginBottom: 32 },
  pergunta: { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
  opcoes: { gap: 12 },
  opcao: {
    backgroundColor: '#1a1d27', borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2a2d3a',
  },
  opcaoTexto: { color: '#fff', fontSize: 16, flex: 1 },
  opcaoSeta: { color: '#2d6fff', fontSize: 22, fontWeight: 'bold' },

  // Confirmação
  confirmacaoTitulo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  confirmacaoSubtitulo: { color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  chamadoCard: {
    backgroundColor: '#1a1d27', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#2a2d3a', marginBottom: 24,
  },
  chamadoTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  chamadoMeta: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeTexto: { fontSize: 12, fontWeight: '600' },
  chamadoDescricao: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  localizacaoLabel: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  localizacaoInput: {
    backgroundColor: '#1a1d27', borderWidth: 1, borderColor: '#2a2d3a',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 15, marginBottom: 24,
  },
  botaoAbrir: {
    backgroundColor: '#2d6fff', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  botaoAbrirTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botaoVoltar2: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2d3a', marginBottom: 10,
  },
  botaoVoltar2Texto: { color: '#aaa', fontSize: 15 },
  botaoReiniciar: { paddingVertical: 12, alignItems: 'center' },
  botaoReiniciarTexto: { color: '#555', fontSize: 14 },
});
