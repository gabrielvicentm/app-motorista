import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import api from '../services/api';
import { deleteToken } from '../storage/token';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

type ApiTrip = {
  origem?: string | null;
  origem_cidade?: string | null;
  origem_uf?: string | null;
  origemCidade?: string | null;
  origemUF?: string | null;
  destino?: string | null;
  destino_cidade?: string | null;
  destino_uf?: string | null;
  destinoCidade?: string | null;
  destinoUF?: string | null;
  data_hora_saida?: string | null;
  dataHoraSaida?: string | null;
  data_saida?: string | null;
  dataSaida?: string | null;
  hora_saida?: string | null;
  horaSaida?: string | null;
  status?: string | null;
  km_inicial?: number | string | null;
  kmInicial?: number | string | null;
};

type TripResponse = {
  data?: ApiTrip | null;
  viagem?: ApiTrip | null;
};

type StopResponse = {
  data?: {
    viagem?: ApiTrip | null;
  };
};

type Trip = {
  origem: string;
  destino: string;
  dataHoraSaida: string | null;
  status: string;
  kmInicial: string;
};

const NO_VALUE = 'Nao informado';

function isTripResponse(value: TripResponse | ApiTrip): value is TripResponse {
  return 'data' in value || 'viagem' in value;
}

function formatLocation(
  location: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
): string {
  if (location) {
    return location;
  }

  if (city && state) {
    return `${city} - ${state}`;
  }

  return city || state || NO_VALUE;
}

function normalizeTrip(
  responseData: TripResponse | ApiTrip | null | undefined,
): Trip | null {
  const tripData =
    responseData && isTripResponse(responseData)
      ? responseData.data || responseData.viagem
      : responseData;

  if (!tripData) {
    return null;
  }

  const date =
    tripData.data_hora_saida ||
    tripData.dataHoraSaida ||
    tripData.data_saida ||
    tripData.dataSaida;
  const time = tripData.hora_saida || tripData.horaSaida;
  const dataHoraSaida = date && time ? `${date}T${time}` : date || null;
  const kmInicial = tripData.km_inicial ?? tripData.kmInicial;

  return {
    origem: formatLocation(
      tripData.origem,
      tripData.origem_cidade || tripData.origemCidade,
      tripData.origem_uf || tripData.origemUF,
    ),
    destino: formatLocation(
      tripData.destino,
      tripData.destino_cidade || tripData.destinoCidade,
      tripData.destino_uf || tripData.destinoUF,
    ),
    dataHoraSaida,
    status: tripData.status || NO_VALUE,
    kmInicial:
      kmInicial === null || kmInicial === undefined || kmInicial === ''
        ? NO_VALUE
        : String(kmInicial),
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return NO_VALUE;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTripStatus(status: string): string {
  if (!status || status === NO_VALUE) {
    return status;
  }

  return status.replace(/_/g, ' ').toUpperCase();
}

function formatElapsedTime(value: string | null, now: Date): string {
  if (!value) {
    return NO_VALUE;
  }

  const startDate = new Date(value);

  if (Number.isNaN(startDate.getTime())) {
    return NO_VALUE;
  }

  const totalMinutes = Math.max(
    0,
    Math.floor((now.getTime() - startDate.getTime()) / 60000),
  );
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }

  parts.push(`${minutes}min`);

  return parts.join(' ');
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [isSubmittingStop, setIsSubmittingStop] = useState(false);

  const elapsedTime = useMemo(
    () => formatElapsedTime(trip?.dataHoraSaida || null, now),
    [now, trip?.dataHoraSaida],
  );

  const loadTrip = useCallback(async (showRefresh = false) => {
    try {
      setErrorMessage('');

      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await api.get<TripResponse | ApiTrip | null>(
        '/motorista/viagens/atual',
      );
      setTrip(normalizeTrip(response.data));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setTrip(null);
        return;
      }

      setErrorMessage('Nao foi possivel carregar a viagem.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  async function handleLogout() {
    await deleteToken();
    navigation.replace('Login');
  }

  async function handleStartStop() {
    if (!stopReason.trim()) {
      Alert.alert('Parada', 'Informe o motivo da parada.');
      return;
    }

    try {
      setIsSubmittingStop(true);

      const response = await api.post<StopResponse>(
        '/motorista/viagens/paradas/iniciar',
        {
          motivo: stopReason.trim(),
        },
      );
      const updatedTrip = normalizeTrip(response.data.data?.viagem);

      if (updatedTrip) {
        setTrip(updatedTrip);
      } else {
        await loadTrip(true);
      }

      setStopReason('');
      setIsStopModalVisible(false);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Nao foi possivel registrar a parada.'
        : 'Nao foi possivel registrar a parada.';

      Alert.alert('Erro ao registrar parada', message);
    } finally {
      setIsSubmittingStop(false);
    }
  }

  async function handleFinishStop() {
    try {
      setIsSubmittingStop(true);

      const response = await api.post<StopResponse>(
        '/motorista/viagens/paradas/finalizar',
      );
      const updatedTrip = normalizeTrip(response.data.data?.viagem);

      if (updatedTrip) {
        setTrip(updatedTrip);
      } else {
        await loadTrip(true);
      }
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || 'Nao foi possivel finalizar a parada.'
        : 'Nao foi possivel finalizar a parada.';

      Alert.alert('Erro ao finalizar parada', message);
    } finally {
      setIsSubmittingStop(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadTrip(true)}
          tintColor="#2563eb"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.description}>Viagem atribuida ao motorista</Text>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={styles.stateText}>Carregando viagem...</Text>
        </View>
      ) : trip ? (
        <View style={styles.tripCard}>
          <InfoRow label="Origem" value={trip.origem} />
          <InfoRow label="Destino" value={trip.destino} />
          <InfoRow
            label="Data e hora de saida"
            value={formatDateTime(trip.dataHoraSaida)}
          />
          <InfoRow label="Tempo decorrido" value={elapsedTime} />
          <InfoRow label="Status da viagem" value={formatTripStatus(trip.status)} />
          <InfoRow label="Km inicial da viagem" value={trip.kmInicial} />

          {trip.status === 'em_andamento' ? (
            <Pressable
              disabled={isSubmittingStop}
              onPress={() => setIsStopModalVisible(true)}
              style={[styles.actionButton, isSubmittingStop && styles.buttonPressed]}
            >
              <Text style={styles.actionButtonText}>Registrar parada</Text>
            </Pressable>
          ) : null}

          {trip.status === 'parada' ? (
            <Pressable
              disabled={isSubmittingStop}
              onPress={handleFinishStop}
              style={[styles.actionButton, isSubmittingStop && styles.buttonPressed]}
            >
              {isSubmittingStop ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionButtonText}>Voltar para estrada</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyText}>Sem Viagem no momento</Text>
        </View>
      )}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable onPress={handleLogout} style={styles.button}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={isStopModalVisible}
        onRequestClose={() => setIsStopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar parada</Text>
            <TextInput
              multiline
              onChangeText={setStopReason}
              placeholder="Motivo da parada"
              style={styles.stopInput}
              value={stopReason}
            />

            <View style={styles.modalActions}>
              <Pressable
                disabled={isSubmittingStop}
                onPress={() => setIsStopModalVisible(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={isSubmittingStop}
                onPress={handleStartStop}
                style={[styles.modalSubmitButton, isSubmittingStop && styles.buttonPressed]}
              >
                {isSubmittingStop ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Enviar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 20,
    marginTop: 16,
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
  stateContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 180,
    padding: 24,
  },
  stateText: {
    color: '#4b5563',
    fontSize: 16,
  },
  emptyText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  infoRow: {
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    gap: 6,
    paddingVertical: 14,
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    marginVertical: 16,
    minHeight: 48,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  buttonPressed: {
    opacity: 0.75,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  stopInput: {
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 16,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
