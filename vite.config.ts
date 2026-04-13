import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const manualChunks = (id: string) => {
  const normalizedId = id.replaceAll('\\', '/');

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) {
    return 'react-vendor';
  }

  if (
    normalizedId.includes('/recharts/') ||
    normalizedId.includes('/d3-') ||
    normalizedId.includes('/victory-vendor/')
  ) {
    return 'charts-vendor';
  }

  if (normalizedId.includes('/lucide-react/')) {
    return 'icons-vendor';
  }

  if (normalizedId.includes('/@google/genai/')) {
    return 'ai-vendor';
  }

  if (normalizedId.includes('/@capacitor/')) {
    return 'capacitor-vendor';
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks,
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
