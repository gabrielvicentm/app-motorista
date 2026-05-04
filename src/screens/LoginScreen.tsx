import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import api, { API_BASE_URL } from '../services/api';
import { saveToken } from '../storage/token';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginResponse = {
  data?: {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
  };
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!cpf || !senha) {
      Alert.alert('Login', 'Informe CPF e senha.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await api.post<LoginResponse>('/auth/motorista/login', {
        cpf,
        senha,
      });

      const token = response.data.data?.access_token;

      if (!token) {
        throw new Error('Access token nao retornado pela API.');
      }

      await saveToken(token);
      navigation.replace('Home');
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ||
          error.message ||
          `Nao foi possivel conectar em ${API_BASE_URL}`
        : error instanceof Error
          ? error.message
          : `Nao foi possivel conectar em ${API_BASE_URL}`;

      Alert.alert('Erro ao entrar', message || 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>App Motorista</Text>

        <TextInput
          autoComplete="off"
          keyboardType="number-pad"
          onChangeText={setCpf}
          placeholder="CPF"
          style={styles.input}
          value={cpf}
        />

        <TextInput
          onChangeText={setSenha}
          placeholder="Senha"
          secureTextEntry
          style={styles.input}
          value={senha}
        />

        <Pressable
          disabled={isLoading}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.button,
            (pressed || isLoading) && styles.buttonPressed,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    gap: 14,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
