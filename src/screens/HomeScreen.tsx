import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import { deleteToken } from '../storage/token';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  async function handleLogout() {
    await deleteToken();
    navigation.replace('Login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo</Text>
      <Text style={styles.description}>
        App mobile base conectado ao backend via axios e JWT.
      </Text>

      <Pressable onPress={handleLogout} style={styles.button}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    borderColor: '#2563eb',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 48,
  },
  buttonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '700',
  },
});
