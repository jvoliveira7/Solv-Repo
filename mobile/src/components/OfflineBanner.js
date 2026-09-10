import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSincronizacao } from '../context/SincronizacaoContext';
import { cores, espaco, raio, fontInter } from '../theme';

// Some sozinho quando está tudo normal (online e sem fila pendente) — só
// aparece quando há algo relevante pro usuário saber.
export default function OfflineBanner() {
  const { estaOnline, pendentes } = useSincronizacao();

  if (estaOnline !== false && pendentes.length === 0) return null;

  const offline = estaOnline === false;
  const mensagem = offline
    ? 'Sem conexão — mostrando dados salvos'
    : `Sincronizando ${pendentes.length} chamado${pendentes.length > 1 ? 's' : ''}...`;

  return (
    <View style={[styles.banner, offline ? styles.offline : styles.sincronizando]}>
      <Text style={[styles.texto, offline ? styles.textoOffline : styles.textoSincronizando]}>
        {mensagem}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: raio.sm,
    marginHorizontal: espaco.lg, marginBottom: espaco.sm, alignItems: 'center',
  },
  offline: { backgroundColor: cores.avisoSuave },
  sincronizando: { backgroundColor: cores.azulSuave },
  texto: { fontSize: 12, fontFamily: fontInter.semibold },
  textoOffline: { color: cores.aviso },
  textoSincronizando: { color: cores.azulClaro },
});
