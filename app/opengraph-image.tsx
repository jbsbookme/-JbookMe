import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'www.jbsbookme.com';
  const proto = hdrs.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  const logoUrls = [`${origin}/Logo%20Public.png`, `${origin}/logo.png`];

  // Prefer ArrayBuffer `src` for best compatibility with @vercel/og.
  let logoBuf: ArrayBuffer | null = null;
  try {
    for (const url of logoUrls) {
      const logoRes = await fetch(url);
      if (logoRes.ok) {
        logoBuf = await logoRes.arrayBuffer();
        break;
      }
    }
  } catch {
    logoBuf = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: 'sans serif',
          textAlign: 'center',
          padding: 40,
        }}
      >
        {logoBuf ? (
          <img
            // @vercel/og supports ArrayBuffer sources for images.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            src={logoBuf as any}
            width={280}
            height={280}
            style={{ marginBottom: 18 }}
          />
        ) : null}

        <div
          style={{
            width: '100%',
            fontSize: 64,
            fontWeight: 800,
            color: '#00e5ff',
            lineHeight: 1.05,
            textAlign: 'center',
          }}
        >
          JBookMe - Booking
        </div>

        <div
          style={{
            width: '100%',
            fontSize: 32,
            marginTop: 8,
            lineHeight: 1.1,
            opacity: 0.95,
            textAlign: 'center',
          }}
        >
          by JB's Barbershop
        </div>

        <div style={{ width: '100%', fontSize: 34, marginTop: 14, lineHeight: 1.2, textAlign: 'center' }}>
          Book your appointment
        </div>

        <div style={{ width: '100%', fontSize: 26, marginTop: 8, opacity: 0.9, lineHeight: 1.2, textAlign: 'center' }}>
          Fast • Secure • Professional
        </div>

        <div style={{ width: '100%', fontSize: 22, marginTop: 20, opacity: 0.85, lineHeight: 1.2, textAlign: 'center' }}>
          Jbsbookme.com
        </div>
      </div>
    ),
    size
  );
}
