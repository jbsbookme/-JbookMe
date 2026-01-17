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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          fontFamily: 'sans serif',
          padding: 60,
          position: 'relative',
        }}
      >
        {/* Left: Logo badge */}
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0,240,255,0.18), rgba(255,215,0,0.12))',
            border: '2px solid rgba(255,255,255,0.10)',
            boxShadow: '0 18px 50px rgba(0,240,255,0.18), 0 18px 50px rgba(255,215,0,0.10)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 14,
              borderRadius: 999,
              border: '2px solid rgba(0,240,255,0.25)',
              opacity: 0.9,
            }}
          />

          {logoBuf ? (
            <img
              // @vercel/og supports ArrayBuffer sources for images.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              src={logoBuf as any}
              width={280}
              height={280}
              style={{
                borderRadius: 999,
                boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
              }}
            />
          ) : (
            <div
              style={{
                width: 280,
                height: 280,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              JBookMe
            </div>
          )}
        </div>

        {/* Right: Copy */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 52,
            paddingRight: 10,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.04,
              color: '#00f0ff',
              letterSpacing: -1,
            }}
          >
            💈 JBookMe
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              marginTop: 10,
              lineHeight: 1.12,
              color: 'rgba(255,255,255,0.96)',
            }}
          >
            JB Barbershop
          </div>

          <div
            style={{
              fontSize: 30,
              marginTop: 18,
              lineHeight: 1.18,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            Book your barber online in seconds.
          </div>

          <div
            style={{
              fontSize: 26,
              marginTop: 12,
              lineHeight: 1.18,
              color: 'rgba(255,255,255,0.88)',
            }}
          >
            Choose your barber • Pick your time • No waiting.
          </div>

          <div
            style={{
              marginTop: 26,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.92)',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              jbsbookme.com
            </div>

            <div
              style={{
                color: 'rgba(255,215,0,0.95)',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              Fast • Simple • Mobile
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
