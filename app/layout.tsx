import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProviderWrapper } from '@/components/providers/session-provider-wrapper';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import { UserProvider } from '@/contexts/user-context';
import { Toaster } from 'react-hot-toast';
import BottomNav from '@/components/layout/bottom-nav-wrapper';
import { Footer } from '@/components/layout/footer';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalHeader } from '@/components/layout/global-header';
import { PauseVideosOnHide } from '@/components/pause-videos-on-hide';
import { SwipeBackGesture } from '@/components/swipe-back-gesture';
import { RegisterServiceWorker } from '@/components/register-service-worker';
import { PwaInstallBanner } from '@/components/pwa-install-banner';
import { LegalAcceptanceGate } from '@/components/legal/legal-acceptance-gate';
import { NativeAuthGuard } from '@/components/native-auth-guard';
import { NativeBackHandler } from '@/components/native-back-handler';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

const PROD_BASE_URL = 'https://www.jbsbookme.com';
const metadataBaseUrl =
  process.env.VERCEL_ENV === 'production'
    ? PROD_BASE_URL
    : process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : PROD_BASE_URL);

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#00f0ff',
};

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),

  title: {
    default: '💈 JBookMe — JB Barbershop',
    template: '%s | 💈 JBookMe — JB Barbershop',
  },

  description:
    'Book your barber online in seconds. Choose your barber • Pick your time • No waiting.',

  applicationName: 'JBookMe',

  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JBookMe',
  },

  formatDetection: {
    telephone: false,
  },

  openGraph: {
    type: 'website',
    title: '💈 JBookMe — JB Barbershop',
    description:
      'Book your barber online in seconds. Choose your barber • Pick your time • No waiting.',
    url: metadataBaseUrl,
    siteName: 'JBookMe',
    images: [
      {
        url: '/og-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'JBookMe preview',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: '💈 JBookMe — JB Barbershop',
    description:
      'Book your barber online in seconds. Choose your barber • Pick your time • No waiting.',
    images: ['/og-preview.jpg'],
  },

  icons: {
    icon: [
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  
 manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    title: '💈 JBookMe — JB Barbershop',
    description: 'Book your barber online in seconds. Choose your barber • Pick your time • No waiting.',
    url: '/',
    siteName: "JB's Barbershop",
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'JBookMe',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '💈 JBookMe — JB Barbershop',
    description: 'Book your barber online in seconds. Choose your barber • Pick your time • No waiting.',
    images: [
      {
        url: '/twitter-image',
        width: 1200,
        height: 630,
        alt: 'JBookMe',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="256x256" href="/icon-256.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        {/* Speed up Cloudinary media loads */}
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.cloudinary.com" crossOrigin="anonymous" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <SessionProviderWrapper>
              <UserProvider>
                <I18nProvider>
                  <GlobalHeader />
                  <LegalAcceptanceGate />
                  <NativeAuthGuard />
                  <NativeBackHandler />
                  <PwaInstallBanner />
                  <RegisterServiceWorker />
                  <PauseVideosOnHide />
                  <SwipeBackGesture />
                  <main className="app-shell min-h-[100dvh] flex flex-col">
                    {children}
                    <Footer />
                  </main>
                  <BottomNav />
                  <Toaster position="top-right" />
                </I18nProvider>
              </UserProvider>
            </SessionProviderWrapper>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
