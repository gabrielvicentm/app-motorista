# app-motorista

App mobile base da transportadora, criado com React Native + Expo.

## Stack

- Expo / React Native
- React Navigation
- Axios
- Expo SecureStore para armazenamento de JWT

## Estrutura

```text
src/
  navigation/
    AppNavigator.tsx
  screens/
    HomeScreen.tsx
    LoginScreen.tsx
  services/
    api.ts
  storage/
    token.ts
```

## API

Configure a URL da API com:

```sh
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.16:8080
```

No mobile, evite `localhost`. Use o IP da maquina na rede ou `10.0.2.2` no emulador Android.

## Comandos

```sh
npm install
npm start
npm run android
```

Valide o bundle Android com:

```sh
npx expo export --platform android --output-dir dist
```
