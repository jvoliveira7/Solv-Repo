import axios from 'axios';
import { getToken } from '../storage/authStorage';

const api = axios.create({
  baseURL: 'http://192.168.0.74:3000/api', // Android emulator → localhost
  timeout: 10000,
});

// Injeta o token em toda requisição automaticamente
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
