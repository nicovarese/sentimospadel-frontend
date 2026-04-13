import type { CapacitorConfig } from '@capacitor/cli';

type MobileEnvironment = 'development' | 'staging' | 'production';

const mobileEnvironment = (process.env.CAPACITOR_ENV ?? process.env.NODE_ENV ?? 'development') as MobileEnvironment;
const isProductionMobile = mobileEnvironment === 'production';

const config: CapacitorConfig = {
  appId: 'uy.sentimospadel.app',
  appName: isProductionMobile ? 'Sentimos Padel' : `Sentimos Padel ${mobileEnvironment}`,
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  server: isProductionMobile
    ? {
        androidScheme: 'https',
      }
    : {
        cleartext: true,
        androidScheme: 'https',
      },
};

export default config;
