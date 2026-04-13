# Sentimos Padel Frontend

Frontend Vite + React de Sentimos Padel.

## Prerrequisitos

- Node.js 22+
- npm 10+

## Desarrollo web local

1. Instalar dependencias:

```powershell
npm ci
```

2. Crear `.env.local` y configurar la API:

```env
VITE_API_BASE_URL=http://localhost:8081
```

3. Levantar la app:

```powershell
npm run dev
```

## Build

```powershell
npm run build
```

## Mobile packaging

Capacitor ya esta integrado.

Scripts utiles:

```powershell
npm run build:mobile
npm run cap:sync:android
npm run cap:sync:ios
npm run cap:open:android
npm run cap:open:ios
```

Guia completa:

- [docs/mobile-packaging.md](docs/mobile-packaging.md)
