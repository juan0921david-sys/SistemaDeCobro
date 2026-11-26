# Aplicación de trabajadores

React Native con Expo SDK 58 y Expo Router. El acceso es por cédula y
contraseña, utilizando cuentas creadas por el administrador.

Instalar dependencias desde la raíz del monorepo, no desde esta carpeta:

```powershell
npm install --include=dev
```

Para arrancar desde esta carpeta:

```powershell
npm start -- --clear --go
```

Usar Expo Go compatible con SDK 58. El celular necesita acceso a la API:
configurar `EXPO_PUBLIC_API_URL=http://IP-DEL-PC:5000/api` en `.env` y usar la
IP local del PC para un dispositivo físico. Mantener el backend encendido.

Comprobaciones locales:

```powershell
npx tsc --noEmit
npx expo install --check
npx expo-modules-autolinking verify
npx expo-doctor
```

La guía de instalación completa está en `../../README.md`.
Se eliminó el script de plantilla `reset-project`, que podía borrar el
código real y reemplazarlo por una aplicación vacía.
