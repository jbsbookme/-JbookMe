import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT (Production/Play Store):
// This app relies on Next.js API routes (`/api/*`). Those routes only exist on the hosted site
// (e.g. https://www.jbsbookme.com). If you ship a native build in bundled mode (capacitor://localhost),
// `/api/*` becomes local and returns 404.
//
// To avoid accidental broken releases, we default to HOSTED mode.
// If you truly need bundled mode for an offline demo, set:
//   CAPACITOR_WEB_SOURCE=bundled

const defaultHostedUrl = 'https://www.jbsbookme.com';
const webSource = (process.env.CAPACITOR_WEB_SOURCE || 'hosted').toLowerCase();
const serverUrl = process.env.CAPACITOR_SERVER_URL || defaultHostedUrl;

const config: CapacitorConfig = {
  appId: 'com.jbs.jbookme',
  appName: 'JBookme',
  webDir: 'out',
};

if (webSource !== 'bundled') {
  config.server = {
    url: serverUrl,
    cleartext: false,
  };
}

export default config;
