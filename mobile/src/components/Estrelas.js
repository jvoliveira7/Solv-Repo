import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { cores } from '../theme';

// Seletor/exibição de nota em estrelas (1-5). Passe `valor` + `onMudar` pra
// deixar tocável (avaliação nova); omita `onMudar` pra exibir só leitura
// (avaliação já enviada).
export default function Estrelas({ valor = 0, onMudar, tamanho = 28, gap = 6 }) {
  const interativo = !!onMudar;

  return (
    <View style={[styles.linha, { gap }]}>
      {[1, 2, 3, 4, 5].map((n) => {
        const preenchida = n <= valor;
        const Estrela = (
          <Text style={{ fontSize: tamanho, color: preenchida ? '#f5c518' : cores.cardBorda }}>
            {preenchida ? '★' : '☆'}
          </Text>
        );

        if (!interativo) return <View key={n}>{Estrela}</View>;

        return (
          <TouchableOpacity key={n} onPress={() => onMudar(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            {Estrela}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center' },
});
