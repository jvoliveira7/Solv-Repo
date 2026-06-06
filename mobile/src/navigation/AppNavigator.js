import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';

// Telas públicas
import LoginScreen from '../screens/LoginScreen';

// Telas do usuário
import HomeScreen from '../screens/user/HomeScreen';
import NovoChamadoScreen from '../screens/user/NovoChamadoScreen';
import DetalheChamadoScreen from '../screens/user/DetalheChamadoScreen';
import GuidedModeScreen from '../screens/user/GuidedModeScreen';

// Telas do técnico
import PainelTecnicoScreen from '../screens/tech/PainelTecnicoScreen';
import DetalheChamadoTecnicoScreen from '../screens/tech/DetalheChamadoTecnicoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: '#0f1117' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
};

// Stack da aba Home do usuário
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Meus Chamados' }} />
      <Stack.Screen name="NovoChamado" component={NovoChamadoScreen} options={{ title: 'Novo Chamado' }} />
      <Stack.Screen name="DetalheChamado" component={DetalheChamadoScreen} options={{ title: 'Chamado' }} />
    </Stack.Navigator>
  );
}

// Stack da aba Guiado
function GuidedStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="GuidedMode" component={GuidedModeScreen} options={{ title: 'Modo Guiado' }} />
    </Stack.Navigator>
  );
}

// Bottom Tabs do usuário
function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f1117',
          borderTopColor: '#2a2d3a',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#2d6fff',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Chamados',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="GuidedTab"
        component={GuidedStack}
        options={{
          tabBarLabel: 'Guiado',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#2d6fff' : '#1a1d27',
              width: 48, height: 48, borderRadius: 24,
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 8,
              borderWidth: focused ? 0 : 1,
              borderColor: '#2a2d3a',
            }}>
              <Text style={{ fontSize: 22 }}>🆘</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={HomeStack} // placeholder até o F-perfil
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// Stack do técnico
function TechStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Painel" component={PainelTecnicoScreen} options={{ title: 'Painel do Técnico' }} />
      <Stack.Screen name="DetalheChamadoTecnico" component={DetalheChamadoTecnicoScreen} options={{ title: 'Chamado' }} />
    </Stack.Navigator>
  );
}

// Auth stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
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
      {!usuario ? <AuthStack /> : isTecnico ? <TechStack /> : <UserTabs />}
    </NavigationContainer>
  );
}
