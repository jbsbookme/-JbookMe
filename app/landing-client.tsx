'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebaseClient';

type Staff = {
  id: string;
  name: string;
  role?: string | null;
  photoUrl?: string | null;
  imageUrl?: string | null;
  specialty?: string | null;
  specialties?: string | null;
  instagram?: string | null;
  isActive?: boolean | null;
};

type GalleryItem = {
  id: string;
  imageUrl?: string | null;
  title?: string | null;
};

type ShopInfo = {
  address?: string | null;
  hours?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  about?: string | null;
  privacy?: string | null;
  terms?: string | null;
};

export function LandingClient() {
  const [barbers, setBarbers] = useState<Staff[]>([]);
  const [stylists, setStylists] = useState<Staff[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) {
          setLoading(false);
          return;
        }

        const staffRef = collection(db, 'barbers');
        const barbersQuery = query(
          staffRef,
          where('role', '==', 'BARBER'),
          where('isActive', '==', true)
        );
        const stylistsQuery = query(
          staffRef,
          where('role', '==', 'STYLIST'),
          where('isActive', '==', true)
        );

        const galleryQuery = query(
          collection(db, 'gallery'),
          orderBy('createdAt', 'desc'),
          limit(12)
        );

        const shopRef = doc(db, 'shop', 'primary');

        const [barbersSnap, stylistsSnap, gallerySnap, shopSnap] = await Promise.all([
          getDocs(barbersQuery),
          getDocs(stylistsQuery),
          getDocs(galleryQuery),
          getDoc(shopRef),
        ]);

        if (cancelled) return;

        const mapStaff = (snap: typeof barbersSnap) =>
          snap.docs.map((doc) => {
            const data = doc.data() as Omit<Staff, 'id'>;
            return { id: doc.id, ...data } as Staff;
          });

        setBarbers(mapStaff(barbersSnap));
        setStylists(mapStaff(stylistsSnap));

        setGallery(
          gallerySnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<GalleryItem, 'id'>),
          }))
        );

        const shopData = (shopSnap.exists() ? shopSnap.data() : {}) as ShopInfo;
        setShopInfo({
          address: shopData?.address ?? null,
          hours: shopData?.hours ?? null,
          instagram: shopData?.instagram ?? null,
          facebook: shopData?.facebook ?? null,
          about: shopData?.about ?? null,
          privacy: shopData?.privacy ?? null,
          terms: shopData?.terms ?? null,
        });
      } catch {
        if (!cancelled) {
          setBarbers([]);
          setStylists([]);
          setGallery([]);
          setShopInfo({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatInstagram = (value?: string | null) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    const withoutProtocol = raw.replace(/^https?:\/\//i, '');
    const withoutDomain = withoutProtocol.replace(/^www\./i, '').replace(/^instagram\.com\//i, '');
    const cleaned = withoutDomain.replace(/^@/, '').replace(/\/$/, '');
    return cleaned;
  };

  const renderStaff = (items: Staff[]) => {
    const list = items;
    if (list.length === 0) return <p className="text-white/50">No results yet.</p>;

    return list.map((item) => {
      const image = item.imageUrl || item.photoUrl || '';
      const instagramHandle = formatInstagram(item.instagram);
      return (
        <div
          key={item.id}
          className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/30"
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="text-lg font-semibold">{item.name}</strong>
            {instagramHandle ? (
              <span className="text-xs text-white/50">@{instagramHandle}</span>
            ) : null}
          </div>
          <div className="mt-2 text-sm text-white/70">
            {item.specialties || item.specialty || 'Specialty not listed'}
          </div>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={item.name}
              className="mt-4 h-40 w-full rounded-xl object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="mt-4 flex h-40 w-full items-center justify-center rounded-xl bg-white/5 text-2xl font-semibold text-white/70">
              {(item.name || 'JB')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <main className="bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-[#00f0ff]/15 blur-[140px]" />
          <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-[#ffd700]/15 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>

        <section className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          <div className="flex flex-col gap-10">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.4em] text-[#00f0ff]">JBookMe</p>
              <h1 className="mt-4 text-[clamp(36px,8vw,84px)] font-semibold leading-[0.95]">
                Elite grooming. Instant bookings in the app.
              </h1>
              <p className="mt-5 text-base text-white/70 md:text-lg">
                Discover top barbers and stylists, explore real work, and book directly in the JBookMe app.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white text-black px-6 py-3 font-semibold transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                >
                  Download the app
                </a>
                <a
                  href="https://play.google.com/store"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white/90 transition hover:border-white/60 hover:-translate-y-0.5"
                >
                  Google Play
                </a>
              </div>
              <p className="mt-4 text-sm text-white/50">Download the app to book your appointment.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Barbers</p>
            <h2 className="mt-2 text-3xl font-semibold">Master barbers</h2>
          </div>
          {loading ? <p className="text-white/50">Loading...</p> : null}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderStaff(barbers)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Stylists</p>
          <h2 className="mt-2 text-3xl font-semibold">Style specialists</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderStaff(stylists)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Gallery</p>
          <h2 className="mt-2 text-3xl font-semibold">Recent work</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-1 hover:border-white/30"
            >
              <div className="text-sm text-white/70">{item.title || 'Untitled'}</div>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title || 'Gallery image'}
                  className="mt-3 h-40 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mt-3 h-40 w-full rounded-xl bg-white/5" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Info</p>
                <h2 className="mt-2 text-3xl font-semibold">Visit us</h2>
                <div className="mt-4 grid gap-2 text-white/70">
                  {shopInfo.about ? <div>{shopInfo.about}</div> : null}
                  <div>Address: {shopInfo.address || 'Coming soon'}</div>
                  <div>Hours: {shopInfo.hours || 'Daily • 9am - 8pm'}</div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {shopInfo.instagram ? (
                      <a
                        href={shopInfo.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                          <path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm0 5.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm4.2-9.3a.78.78 0 1 1-1.56 0 .78.78 0 0 1 1.56 0ZM12 3.6c2.4 0 2.7 0 3.6.05.92.04 1.55.2 2.1.42.58.23.97.5 1.4.93.43.43.7.82.93 1.4.22.55.38 1.18.42 2.1.05.9.05 1.2.05 3.6s0 2.7-.05 3.6c-.04.92-.2 1.55-.42 2.1-.23.58-.5.97-.93 1.4-.43.43-.82.7-1.4.93-.55.22-1.18.38-2.1.42-.9.05-1.2.05-3.6.05s-2.7 0-3.6-.05c-.92-.04-1.55-.2-2.1-.42-.58-.23-.97-.5-1.4-.93-.43-.43-.7-.82-.93-1.4-.22-.55-.38-1.18-.42-2.1-.05-.9-.05-1.2-.05-3.6s0-2.7.05-3.6c.04-.92.2-1.55.42-2.1.23-.58.5-.97.93-1.4.43-.43.82-.7 1.4-.93.55-.22 1.18-.38 2.1-.42.9-.05 1.2-.05 3.6-.05Zm0-1.2c-2.43 0-2.73 0-3.68.05-1 .05-1.7.22-2.3.47-.62.24-1.15.56-1.68 1.09-.53.53-.85 1.06-1.1 1.68-.24.6-.41 1.3-.46 2.3C2.4 8.04 2.4 8.34 2.4 10.8s0 2.76.05 3.72c.05 1 .22 1.7.46 2.3.25.62.57 1.15 1.1 1.68.53.53 1.06.85 1.68 1.1.6.24 1.3.41 2.3.46.95.05 1.25.05 3.68.05s2.73 0 3.68-.05c1-.05 1.7-.22 2.3-.46.62-.25 1.15-.57 1.68-1.1.53-.53.85-1.06 1.1-1.68.24-.6.41-1.3.46-2.3.05-.95.05-1.25.05-3.68s0-2.73-.05-3.68c-.05-1-.22-1.7-.46-2.3-.25-.62-.57-1.15-1.1-1.68-.53-.53-1.06-.85-1.68-1.1-.6-.24-1.3-.41-2.3-.46-.95-.05-1.25-.05-3.68-.05Z" />
                        </svg>
                        Instagram
                      </a>
                    ) : null}
                    {shopInfo.facebook ? (
                      <a
                        href={shopInfo.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                          <path d="M13.2 20.4v-7.2h2.44l.36-2.8h-2.8V8.6c0-.8.22-1.34 1.36-1.34h1.46V4.8c-.7-.08-1.56-.12-2.42-.12-2.4 0-4.04 1.46-4.04 4.14v1.62H7.2v2.8h2.36v7.2h3.64Z" />
                        </svg>
                        Facebook
                      </a>
                    ) : null}
                  </div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white text-black px-6 py-3 text-center font-semibold transition hover:-translate-y-0.5"
              >
                Download the app
              </a>
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white/90 transition hover:border-white/60"
              >
                Google Play
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-[#00f0ff]/20 via-transparent to-[#ffd700]/20 p-[1px]">
          <div className="rounded-3xl bg-black px-8 py-12 text-center">
            <h2 className="text-3xl font-semibold">Ready to book?</h2>
            <p className="mt-3 text-white/70">Download the app and reserve your slot.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white text-black px-6 py-3 font-semibold transition hover:-translate-y-0.5"
              >
                Download the app
              </a>
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white/90 transition hover:border-white/60"
              >
                Google Play
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div>JBookMe</div>
          <div className="flex gap-4">
              <a href="/privacy" className="hover:text-white">Privacy</a>
              <a href="/terms" className="hover:text-white">Terms</a>
            </div>
        </div>
      </footer>
    </main>
  );
}
