import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import api from '../services/api';
import { deleteToken, getToken } from '../storage/token';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [initialRouteName, setInitialRouteName] =
    useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      try {
        const token = await getToken();

        if (!token) {
          return;
        }

        await api.get('/auth/me');

        if (isMounted) {
          setInitialRouteName('Home');
        }
      } catch {
        await deleteToken();
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Verificando sessao...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Entrar' }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'App Motorista' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#4b5563',
    fontSize: 16,
  },
});
