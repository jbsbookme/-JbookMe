import type { CapacitorConfig } from '@capacitor/cli';

const useBundledWeb = process.env.CAPACITOR_USE_BUNDLED_WEB === 'true';
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://www.jbsbookme.com';

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
