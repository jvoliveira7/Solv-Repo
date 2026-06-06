import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@solv:token';
const USER_KEY = '@solv:user';

export async function saveAuth(token, usuario) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function getUsuario() {
  const json = await AsyncStorage.getItem(USER_KEY);
  return json ? JSON.parse(json) : null;
}

export async function clearAuth() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}
