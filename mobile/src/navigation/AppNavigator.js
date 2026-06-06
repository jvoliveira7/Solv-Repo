import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';

// Telas públicas
import LoginScreen from '../screens/LoginScreen';

// Telas do usuário
import HomeScreen from '../screens/user/HomeScreen';
import NovoChamadoScreen from '../screens/user/NovoChamadoScreen';
import DetalheChamadoScreen from '../screens/user/DetalheChamadoScreen';

// Telas do técnico
import PainelTecnicoScreen from '../screens/tech/PainelTecnicoScreen';
import DetalheChamadoTecnicoScreen from '../screens/tech/DetalheChamadoTecnicoScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f1117' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Meus Chamados' }} />
      <Stack.Screen name="NovoChamado" component={NovoChamadoScreen} options={{ title: 'Novo Chamado' }} />
      <Stack.Screen name="DetalheChamado" component={DetalheChamadoScreen} options={{ title: 'Chamado' }} />
    </Stack.Navigator>
  );
}

function TechStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f1117' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Painel" component={PainelTecnicoScreen} options={{ title: 'Painel do Técnico' }} />
      <Stack.Screen name="DetalheChamadoTecnico" component={DetalheChamadoTecnicoScreen} options={{ title: 'Chamado' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' }}>
        <ActivityIndicator size="large" color="#2d6fff" />
      </View>
    );
  }

  const isTecnico = usuario?.perfil === 'TECNICO' || usuario?.perfil === 'ADMIN';

  return (
    <NavigationContainer>
      {!usuario ? <AuthStack /> : isTecnico ? <TechStack /> : <UserStack />}
    </NavigationContainer>
  );
}
