import type { CapacitorConfig } from '@capacitor/cli';

const useBundledWeb = process.env.CAPACITOR_USE_BUNDLED_WEB === 'true';
const defaultHostedUrl = 'https://www.jbsbookme.com';
const serverUrl = process.env.CAPACITOR_SERVER_URL || defaultHostedUrl;

const config: CapacitorConfig = {
  appId: 'com.jbs.jbookme',
  appName: 'JBookme',
  webDir: 'out',
  ...(useBundledWeb
    ? {}
    : {
      server: {
        url: serverUrl,
        cleartext: false,
      },
    }),
};

export default config;
