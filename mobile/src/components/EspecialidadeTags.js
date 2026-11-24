import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { cores, raio } from '../theme';
import { ESPECIALIDADES, ROTULO_ESPECIALIDADE } from '../utils/especialidades';

// Tags de especialidade do técnico.
//  - leitura:  <EspecialidadeTags valores={ids} />            (só as escolhidas)
//  - edição:   <EspecialidadeTags valores={ids} editavel maximo={4} onToggle={fn} />
//              (todas as tags; as que passam do limite ficam apagadas)
//  - compacto: chips menores, para caber em cartões de chamado
export default function EspecialidadeTags({ valores = [], editavel = false, maximo, onToggle, compacto = false }) {
  const ids = editavel
    ? ESPECIALIDADES.map((e) => e.id)
    : valores.filter((id) => ROTULO_ESPECIALIDADE[id]);

  return (
    <View style={styles.linha}>
      {ids.map((id) => {
        const ativa = valores.includes(id);
        const bloqueada = editavel && !ativa && maximo != null && valores.length >= maximo;
        const chip = (
          <View style={[
            styles.chip,
            compacto && styles.chipCompacto,
            ativa && styles.chipAtivo,
            bloqueada && styles.chipBloqueado,
          ]}>
            <Text style={[
              styles.texto,
              compacto && styles.textoCompacto,
              ativa && styles.textoAtivo,
              bloqueada && styles.textoBloqueado,
            ]}>
              {ROTULO_ESPECIALIDADE[id]}
            </Text>
          </View>
        );

        if (!editavel) return <View key={id}>{chip}</View>;
        return (
          <TouchableOpacity key={id} onPress={() => onToggle?.(id)} disabled={bloqueada} activeOpacity={0.7}>
            {chip}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: raio.sm, borderWidth: 1, borderColor: '#2f3447',
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipCompacto: { paddingHorizontal: 9, paddingVertical: 4 },
  chipAtivo: { backgroundColor: cores.azulSuave, borderColor: cores.azul },
  chipBloqueado: { opacity: 0.4 },
  texto: { color: cores.textoSecundario, fontSize: 13 },
  textoCompacto: { fontSize: 11 },
  textoAtivo: { color: cores.azulClaro, fontWeight: '600' },
  textoBloqueado: { color: cores.textoTerciario },
});
