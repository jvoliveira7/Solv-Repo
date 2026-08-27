import { io } from 'socket.io-client';
import { getToken } from '../storage/authStorage';

const SOCKET_URL = 'http://192.168.0.74:3000';

let socket = null;

export async function conectarSocket() {
  if (socket?.connected) return socket;

  const token = await getToken();
  console.log('Token para socket:', token ? 'OK' : 'NULO');

  return new Promise((resolve, reject) => {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      console.log('Erro de conexão:', err.message);
      reject(err);
    });

    socket.on('disconnect', () => console.log('Socket desconectado'));
  });
}

export function getSocket() {
  return socket;
}

export function desconectarSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}