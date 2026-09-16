import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider } from './src/context/ChatContext';
import { SincronizacaoProvider } from './src/context/SincronizacaoContext';
import { NotificacaoProvider } from './src/context/NotificacaoContext';
import AppNavigator from './src/navigation/AppNavigator';
import { cores } from './src/theme';

export default function App() {
  const [fontesCarregadas] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontesCarregadas) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={cores.azul} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SincronizacaoProvider>
          <ChatProvider>
            <NotificacaoProvider>
              <StatusBar style="light" />
              <AppNavigator />
            </NotificacaoProvider>
          </ChatProvider>
        </SincronizacaoProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
