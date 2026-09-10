import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { cores, fontInter } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/user/HomeScreen';
import NovoChamadoScreen from '../screens/user/NovoChamadoScreen';
import DetalheChamadoScreen from '../screens/user/DetalheChamadoScreen';
import GuidedModeScreen from '../screens/user/GuidedModeScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatsListScreen from '../screens/ChatsListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AjustesScreen from '../screens/AjustesScreen';
import PainelTecnicoScreen from '../screens/tech/PainelTecnicoScreen';
import DetalheChamadoTecnicoScreen from '../screens/tech/DetalheChamadoTecnicoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: '#0f1117' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontFamily: fontInter.bold },
};

const tabBarStyleComum = {
  backgroundColor: cores.fundo,
  borderTopColor: cores.divisor,
  borderTopWidth: 1,
  height: 72,
  paddingTop: 12,
  paddingBottom: 14,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Ajustes" component={AjustesScreen} options={{ title: 'Ajustes' }} />
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
  HomeTab: 'file-tray-full',
  ChatsTab: 'chatbubble-ellipses',
  GuidedTab: 'compass',
  PerfilTab: 'person-circle',
  PainelTab: 'grid',
};

const LABEL_POR_ABA = {
  HomeTab: 'Chamados',
  ChatsTab: 'Chats',
  GuidedTab: 'Guiado',
  PerfilTab: 'Perfil',
  PainelTab: 'Painel',
};

function TabIcone({ nomeAba, focused }) {
  const nomeIcone = ICONE_POR_ABA[nomeAba];
  const label = LABEL_POR_ABA[nomeAba];
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 68 }}>
      <View
        style={{
          width: 40, height: 28, borderRadius: 14,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: focused ? cores.azulSuave : 'transparent',
        }}
      >
        <Ionicons
          name={focused ? nomeIcone : `${nomeIcone}-outline`}
          size={20}
          color={focused ? cores.azulClaro : cores.textoTerciario}
        />
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: focused ? cores.azulClaro : cores.textoTerciario,
          fontSize: 11,
          fontFamily: focused ? fontInter.semibold : fontInter.medium,
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: tabBarStyleComum,
        tabBarActiveTintColor: cores.azul,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => <TabIcone nomeAba={route.name} focused={focused} />,
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
      <Stack.Screen name="Painel" component={PainelTecnicoScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Ajustes" component={AjustesScreen} options={{ title: 'Ajustes' }} />
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
        tabBarStyle: tabBarStyleComum,
        tabBarActiveTintColor: cores.azul,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => <TabIcone nomeAba={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="PainelTab" component={PainelStack} options={{ tabBarLabel: 'Painel' }} />
      <Tab.Screen name="ChatsTab" component={ChatsStackTecnico} options={{ tabBarLabel: 'Chats' }} />
      <Tab.Screen name="PerfilTab" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
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
