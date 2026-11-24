import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { cores, fontInter } from '../theme';

function iniciais(nome = '') {
  const partes = nome.trim().split(' ');
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}


export default function Avatar({ uri, nome, size = 32, cor = cores.azul, fonteSize, style }) {
  const raio = size / 2;
  const tamanhoFonte = fonteSize || Math.max(10, Math.round(size * 0.38));

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: raio }, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: raio, backgroundColor: cor },
        style,
      ]}
    >
      <Text style={[styles.texto, { fontSize: tamanhoFonte }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center' },
  texto: { color: '#fff', fontFamily: fontInter.bold },
});
