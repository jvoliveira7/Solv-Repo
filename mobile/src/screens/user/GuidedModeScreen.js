import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { FLUXO_GUIADO } from '../../utils/fluxoGuiado';
import api from '../../services/api';
import { cores, espaco, raio, comum } from '../../theme';

const TOTAL_PASSOS_ESTIMADO = 4;

export default function GuidedModeScreen({ navigation }) {
  const [historico, setHistorico] = useState(['inicio']);
  const etapaAtual = FLUXO_GUIADO[historico[historico.length - 1]];

  function avancar(proximoId) {
    setHistorico([...historico, proximoId]);
  }

  function voltar() {
    if (historico.length > 1) setHistorico(historico.slice(0, -1));
  }

  function reiniciar() {
    setHistorico(['inicio']);
  }

  if (etapaAtual?.resultado) {
    return (
      <ConfirmacaoChamado
        resultado={etapaAtual.resultado}
        onVoltar={voltar}
        onReiniciar={reiniciar}
        navigation={navigation}
      />
    );
  }

  const passo = historico.length; // 1-indexado
  const progresso = Math.min(passo / TOTAL_PASSOS_ESTIMADO, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {historico.length > 1 ? (
          <TouchableOpacity onPress={voltar} style={styles.botaoVoltarIcone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.botaoVoltarSeta}>←</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
        <Text style={styles.headerTitulo}>Modo guiado</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.barraProgressoWrap}>
        <View style={styles.barraProgressoFundo}>
          <View style={[styles.barraProgressoPreenchida, { width: `${progresso * 100}%` }]} />
        </View>
        <Text style={styles.passoTexto}>Passo {passo} de {TOTAL_PASSOS_ESTIMADO}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pergunta}>{etapaAtual.pergunta}</Text>

        <View style={styles.opcoes}>
          {etapaAtual.opcoes.map((opcao, index) => (
            <TouchableOpacity
              key={index}
              style={styles.opcao}
              onPress={() => avancar(opcao.proximoId)}
              activeOpacity={0.7}
            >
              <Text style={styles.opcaoTexto}>{opcao.label}</Text>
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
    BAIXA: cores.sucesso, MEDIA: cores.aviso, ALTA: cores.erro, CRITICA: cores.roxo,
  };

  async function handleAbrir() {
    setEnviando(true);
    try {
      await api.post('/chamados', {
        titulo: resultado.titulo,
        descricao: resultado.descricao,
        categoria: resultado.categoria,
        prioridade: resultado.prioridade,
        localizacao: localizacao.trim() || undefined,
      });

      navigation.navigate('HomeTab', { screen: 'Home', params: { chamadoAberto: true } });
      onReiniciar();
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o chamado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onVoltar} style={styles.botaoVoltarIcone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.botaoVoltarSeta}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Revise antes de enviar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.confirmacaoSubtitulo}>
          Seu chamado será aberto com essas informações.
        </Text>

        <Text style={styles.campoLabel}>Categoria detectada</Text>
        <View style={styles.campoValorLinha}>
          <Text style={styles.campoValorIcone}>🏷️</Text>
          <Text style={styles.campoValorTexto}>{resultado.titulo}</Text>
        </View>

        <Text style={styles.campoLabel}>Descrição gerada</Text>
        <Text style={styles.campoDescricao}>{resultado.descricao}</Text>

        <Text style={styles.campoLabel}>Localização</Text>
        <TextInput
          style={styles.input}
          placeholder="📍 Onde você está? (opcional)"
          placeholderTextColor={cores.placeholder}
          value={localizacao}
          onChangeText={setLocalizacao}
        />

        <Text style={styles.campoLabel}>Prioridade sugerida</Text>
        <View style={[styles.badge, { backgroundColor: PRIORIDADE_COR[resultado.prioridade] + '22', alignSelf: 'flex-start' }]}>
          <Text style={[styles.badgeTexto, { color: PRIORIDADE_COR[resultado.prioridade] }]}>
            {resultado.prioridade}
          </Text>
        </View>

        <View style={styles.avisoOk}>
          <Text style={styles.avisoOkIcone}>✓</Text>
          <Text style={styles.avisoOkTexto}>Tudo certo? Você ainda pode corrigir qualquer informação antes de enviar.</Text>
        </View>

        <TouchableOpacity
          style={[styles.botao, enviando && styles.botaoDesabilitado]}
          onPress={handleAbrir}
          disabled={enviando}
        >
          {enviando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botaoTexto}>Abrir este chamado</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoSecundario} onPress={onVoltar}>
          <Text style={styles.botaoSecundarioTexto}>← Voltar e corrigir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoTerciario} onPress={onReiniciar}>
          <Text style={styles.botaoTerciarioTexto}>↺ Recomeçar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: espaco.lg, paddingTop: 16, paddingBottom: 4,
  },
  botaoVoltarIcone: { width: 24 },
  botaoVoltarSeta: { color: cores.texto, fontSize: 20 },
  headerTitulo: { color: cores.texto, fontSize: 16, fontWeight: '700' },

  barraProgressoWrap: { paddingHorizontal: espaco.lg, marginTop: 14, marginBottom: 6 },
  barraProgressoFundo: { height: 4, borderRadius: 2, backgroundColor: cores.card, overflow: 'hidden' },
  barraProgressoPreenchida: { height: 4, backgroundColor: cores.azul, borderRadius: 2 },
  passoTexto: { color: cores.textoTerciario, fontSize: 11, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  content: { padding: espaco.xl, paddingTop: 12, paddingBottom: 40 },
  pergunta: { color: cores.texto, fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: 24 },

  opcoes: { gap: 12 },
  opcao: {
    backgroundColor: cores.card, borderRadius: raio.lg, padding: 18,
    borderWidth: 1, borderColor: cores.cardBorda,
  },
  opcaoTexto: { color: cores.texto, fontSize: 16 },

  rodapeBotao: { padding: espaco.lg },
  botao: { ...comum.botaoPrimario },
  botaoDesabilitado: { opacity: 0.4 },
  botaoTexto: { ...comum.botaoPrimarioTexto, fontSize: 16 },

  confirmacaoSubtitulo: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  campoLabel: {
    color: cores.textoSecundario, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 18,
  },
  campoValorLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoValorIcone: { fontSize: 18 },
  campoValorTexto: { color: cores.texto, fontSize: 18, fontWeight: '700' },
  campoDescricao: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
  input: { ...comum.input },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: raio.sm },
  badgeTexto: { fontSize: 12, fontWeight: '700' },

  avisoOk: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: cores.sucessoSuave, borderRadius: raio.md,
    padding: 14, marginTop: 28,
  },
  avisoOkIcone: { color: cores.sucesso, fontSize: 15, fontWeight: '700' },
  avisoOkTexto: { color: cores.sucesso, fontSize: 13, flex: 1, lineHeight: 18 },

  botaoSecundario: {
    borderRadius: raio.md, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: cores.cardBorda, marginTop: 12,
  },
  botaoSecundarioTexto: { color: cores.textoSecundario, fontSize: 15 },
  botaoTerciario: { paddingVertical: 12, alignItems: 'center' },
  botaoTerciarioTexto: { color: cores.textoTerciario, fontSize: 14 },
});
