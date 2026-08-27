import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { saveAuth, getToken, getUsuario, clearAuth } from '../storage/authStorage';
import api from '../services/api';

// Estado inicial
const initialState = {
  usuario: null,
  token: null,
  carregando: true,
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case 'RESTAURAR_SESSAO':
      return { ...state, usuario: action.usuario, token: action.token, carregando: false };
    case 'LOGIN':
      return { ...state, usuario: action.usuario, token: action.token, carregando: false };
    case 'LOGOUT':
      return { ...initialState, carregando: false };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restaura sessão ao abrir o app
    useEffect(() => {
      async function restaurarSessao() {
        try {
          await clearAuth(); // força limpeza — REMOVER DEPOIS
          dispatch({ type: 'LOGOUT' });
        } catch {
          dispatch({ type: 'LOGOUT' });
        }
      }
      restaurarSessao();
    }, []);
    
  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    await saveAuth(data.token, data.usuario);
    dispatch({ type: 'LOGIN', usuario: data.usuario, token: data.token });
    return data.usuario;
  }

  async function logout() {
    await clearAuth();
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
