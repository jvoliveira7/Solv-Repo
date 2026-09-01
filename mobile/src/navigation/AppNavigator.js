import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { cores } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/user/HomeScreen';
import NovoChamadoScreen from '../screens/user/NovoChamadoScreen';
import DetalheChamadoScreen from '../screens/user/DetalheChamadoScreen';
import GuidedModeScreen from '../screens/user/GuidedModeScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatsListScreen from '../screens/ChatsListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PainelTecnicoScreen from '../screens/tech/PainelTecnicoScreen';
import DetalheChamadoTecnicoScreen from '../screens/tech/DetalheChamadoTecnicoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: '#0f1117' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Meus Chamados' }} />
      <Stack.Screen name="NovoChamado" component={NovoChamadoScreen} options={{ title: 'Novo Chamado' }} />
      <Stack.Screen name="DetalheChamado" component={DetalheChamadoScreen} options={{ title: 'Chamado' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function GuidedStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="GuidedMode" component={GuidedModeScreen} options={{ title: 'Modo Guiado' }} />
    </Stack.Navigator>
  );
}

function ChatsStackUsuario() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ListaChats" options={{ headerShown: false }}>
        {(props) => <ChatsListScreen {...props} route={{ ...props.route, params: { isTecnico: false } }} />}
      </Stack.Screen>
      <Stack.Screen name="DetalheChamado" component={DetalheChamadoScreen} options={{ title: 'Chamado' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const ICONE_POR_ABA = {
  HomeTab: '📋',
  ChatsTab: '💬',
  GuidedTab: '🆘',
  PerfilTab: '👤',
  PainelTab: '📋',
};

function TabIcone({ nomeAba, focused, color }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: 20, height: 2, borderRadius: 1, marginBottom: 6,
        backgroundColor: focused ? cores.azul : 'transparent',
      }} />
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{ICONE_POR_ABA[nomeAba]}</Text>
    </View>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: cores.fundo, borderTopColor: cores.divisor,
          borderTopWidth: 1, height: 66, paddingBottom: 10, paddingTop: 8,
        },
        tabBarActiveTintColor: cores.azul,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => <TabIcone nomeAba={route.name} focused={focused} color={color} />,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Chamados' }} />
      <Tab.Screen name="ChatsTab" component={ChatsStackUsuario} options={{ tabBarLabel: 'Chats' }} />
      <Tab.Screen name="GuidedTab" component={GuidedStack} options={{ tabBarLabel: 'Guiado' }} />
      <Tab.Screen name="PerfilTab" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function PainelStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Painel" component={PainelTecnicoScreen} options={{ title: 'Painel do Técnico' }} />
      <Stack.Screen name="DetalheChamadoTecnico" component={DetalheChamadoTecnicoScreen} options={{ title: 'Chamado' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ChatsStackTecnico() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ListaChats" options={{ headerShown: false }}>
        {(props) => <ChatsListScreen {...props} route={{ ...props.route, params: { isTecnico: true } }} />}
      </Stack.Screen>
      <Stack.Screen name="DetalheChamadoTecnico" component={DetalheChamadoTecnicoScreen} options={{ title: 'Chamado' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function TechTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: cores.fundo, borderTopColor: cores.divisor,
          borderTopWidth: 1, height: 66, paddingBottom: 10, paddingTop: 8,
        },
        tabBarActiveTintColor: cores.azul,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => <TabIcone nomeAba={route.name} focused={focused} color={color} />,
      })}
    >
      <Tab.Screen name="PainelTab" component={PainelStack} options={{ tabBarLabel: 'Painel' }} />
      <Tab.Screen name="ChatsTab" component={ChatsStackTecnico} options={{ tabBarLabel: 'Chats' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
    <NavigationContainer ref={navigationRef}>
      {!usuario ? <AuthStack /> : isTecnico ? <TechTabs /> : <UserTabs />}
    </NavigationContainer>
  );
}
