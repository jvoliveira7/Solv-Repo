import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIXO = '@solv:cache:';

export async function salvarCache(chave, dados) {
  await AsyncStorage.setItem(PREFIXO + chave, JSON.stringify(dados));
}

export async function lerCache(chave) {
  const json = await AsyncStorage.getItem(PREFIXO + chave);
  return json ? JSON.parse(json) : null;
}
