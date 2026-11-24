import axios from 'axios';
import { getToken } from '../storage/authStorage';

const api = axios.create({
  baseURL: 'https://laurine-defrayable-jenna.ngrok-free.dev/api',
  timeout: 10000,
  headers: { 'ngrok-skip-browser-warning': 'true' },
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
