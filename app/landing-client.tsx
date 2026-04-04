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
  bio?: string | null;
  experience?: string | null;
  isActive?: boolean | null;
};

type GalleryItem = {
  id: string;
  imageUrl?: string | null;
  title?: string | null;
  barberName?: string | null;
  showTitle?: boolean | null;
};

type ShopInfo = {
  address?: string | null;
  hours?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  about?: string | null;
  privacy?: string | null;
  terms?: string | null;
  review1?: string | null;
  review2?: string | null;
  review3?: string | null;
  socials?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    whatsapp?: string | null;
    website?: string | null;
  } | null;
};

export function LandingClient() {
  const [barbers, setBarbers] = useState<Staff[]>([]);
  const [stylists, setStylists] = useState<Staff[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>({});
  const [loading, setLoading] = useState(true);
  const [activeStoreLinks, setActiveStoreLinks] = useState<string | null>(null);

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
          collection(db, 'shopGallery'),
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
        const socials = shopData?.socials ?? null;
        setShopInfo({
          address: shopData?.address ?? null,
          hours: shopData?.hours ?? null,
          instagram: shopData?.instagram ?? socials?.instagram ?? null,
          facebook: shopData?.facebook ?? socials?.facebook ?? null,
          tiktok: shopData?.tiktok ?? socials?.tiktok ?? null,
          whatsapp: shopData?.whatsapp ?? socials?.whatsapp ?? null,
          website: shopData?.website ?? socials?.website ?? null,
          about: shopData?.about ?? null,
          privacy: shopData?.privacy ?? null,
          terms: shopData?.terms ?? null,
          review1: shopData?.review1 ?? null,
          review2: shopData?.review2 ?? null,
          review3: shopData?.review3 ?? null,
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

  const renderStaff = (items: Staff[]) => {
    if (items.length === 0) return <p className="text-[#e5e5e5]/60">No results yet.</p>;

    return items.map((item) => {
      const image = item.imageUrl || item.photoUrl || '';
      return (
        <div
          key={item.id}
          className="group relative overflow-hidden rounded-3xl border border-[#ff2d2d]/12 bg-black p-7 transition duration-300 hover:-translate-y-2 hover:border-[#ff2d2d]/45 hover:shadow-[0_0_28px_rgba(255,45,45,0.35)]"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={item.name}
              className="h-40 w-full rounded-2xl object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-black/70 text-2xl font-semibold text-white/70">
              {(item.name || 'JB')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div className="mt-5 space-y-3">
            <strong className="block text-lg font-semibold text-[#3b82f6]">{item.name}</strong>
            <div className="text-sm text-[#e5e5e5]">
              {item.specialties || item.specialty || 'Specialty not listed'}
            </div>
            {shopInfo.review1 ? (
              <div className="text-sm text-[#e5e5e5]">{shopInfo.review1}</div>
            ) : null}
            {item.bio ? (
              <div
                className="text-sm text-[#e5e5e5]"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.bio}
              </div>
            ) : null}
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  setActiveStoreLinks((prev) =>
                    prev === `book-${item.id}` ? null : `book-${item.id}`
                  )
                }
                className="inline-flex w-full items-center justify-center rounded-full border border-[#ff2d2d]/70 bg-transparent px-6 py-3 text-base font-semibold text-[#e5e5e5] transition duration-300 hover:-translate-y-1 hover:border-[#ff2d2d] hover:bg-[#ff2d2d] hover:text-[#ffd700] hover:shadow-[0_0_24px_rgba(255,45,45,0.6)]"
              >
                Book now
              </button>
              {activeStoreLinks === `book-${item.id}` ? (
                <div className="mt-3 flex gap-2">
                  <a
                    href="https://play.google.com/store"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                  >
                    Google Play
                  </a>
                  <a
                    href="https://apps.apple.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                  >
                    App Store
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <main
      className="bg-black text-[#e5e5e5] overflow-x-hidden"
      style={{
        fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-48 right-0 h-[28rem] w-[28rem] rounded-full bg-[#3b82f6]/18 blur-[160px]" />
          <div className="absolute -bottom-48 left-0 h-[28rem] w-[28rem] rounded-full bg-[#ff2d2d]/14 blur-[160px]" />
          <div className="absolute inset-0 bg-black" />
        </div>

        <section className="mx-auto max-w-6xl px-5 sm:px-6 pt-20 sm:pt-28 pb-18 sm:pb-28">
          <div className="flex flex-col gap-10">
            <div className="max-w-3xl animate-hero">
              <p className="text-base uppercase tracking-[0.55em] text-[#ffd700] drop-shadow-[0_0_12px_rgba(255,215,0,0.4)]">
                JBOOKME
              </p>
              <h1 className="mt-4 text-[clamp(30px,9vw,84px)] font-semibold leading-[0.98] tracking-[-0.02em] text-[#3b82f6]">
                Premium experience. Book in seconds.
              </h1>
              <p className="mt-4 text-[15px] leading-7 text-[#e5e5e5]/80 sm:text-base md:text-lg">
                Discover top barbers and stylists, see real work, and book directly in the JBookMe app.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveStoreLinks((prev) =>
                        prev === 'hero' ? null : 'hero'
                      )
                    }
                    className="rounded-full border border-[#ff1a1a] bg-[#ff1a1a] px-8 py-4 text-center text-base font-semibold text-[#ffd700] transition duration-300 hover:-translate-y-1 hover:scale-[1.03]"
                  >
                    Download the app
                  </button>
                  {activeStoreLinks === 'hero' ? (
                    <div className="mt-3 flex gap-2">
                      <a
                        href="https://play.google.com/store"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                      >
                        Google Play
                      </a>
                      <a
                        href="https://apps.apple.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                      >
                        App Store
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#e5e5e5]/50">Barbers</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Master barbers</h2>
          </div>
          {loading ? <p className="text-[#e5e5e5]/60">Loading...</p> : null}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderStaff(barbers)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#e5e5e5]/50">Stylists</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Style specialists</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderStaff(stylists)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#e5e5e5]/50">Gallery</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Recent work</h2>
        </div>
        <div className="mt-8 grid gap-5 grid-cols-2 lg:grid-cols-4">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-3xl border border-[#ff2d2d]/20 bg-white/[0.03] p-3 shadow-[0_0_20px_rgba(255,45,45,0.15)] transition duration-300 hover:-translate-y-2 hover:border-[#ff2d2d]/60 hover:shadow-[0_0_32px_rgba(255,45,45,0.35)]"
            >
              {item.showTitle ? (
                <div className="text-sm text-[#e5e5e5]/75">
                  {item.title || item.barberName || 'Untitled'}
                </div>
              ) : null}
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title || item.barberName || 'Gallery image'}
                  className={
                    item.showTitle
                      ? "mt-3 h-40 sm:h-44 w-full rounded-2xl object-cover transition duration-300 group-hover:scale-[1.04]"
                      : "h-40 sm:h-44 w-full rounded-2xl object-cover transition duration-300 group-hover:scale-[1.04]"
                  }
                />
              ) : (
                <div
                  className={
                    item.showTitle
                      ? "mt-3 h-40 sm:h-44 w-full rounded-2xl bg-white/5"
                      : "h-40 sm:h-44 w-full rounded-2xl bg-white/5"
                  }
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="rounded-[32px] border border-[#ff2d2d]/20 bg-white/[0.03] p-6 sm:p-8 shadow-[0_0_24px_rgba(255,45,45,0.18)] md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#e5e5e5]/50">Info</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Visit us</h2>
              <div className="mt-4 grid gap-2 text-[#e5e5e5]/80">
                {shopInfo.about ? <div>{shopInfo.about}</div> : null}
                <div>Address: {shopInfo.address || 'Coming soon'}</div>
                <div>Hours: {shopInfo.hours || 'Daily - 9am - 8pm'}</div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {shopInfo.instagram ? (
                    <a
                      href={shopInfo.instagram}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm0 5.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm4.2-9.3a.78.78 0 1 1-1.56 0 .78.78 0 0 1 1.56 0ZM12 3.6c2.4 0 2.7 0 3.6.05.92.04 1.55.2 2.1.42.58.23.97.5 1.4.93.43.43.7.82.93 1.4.22.55.38 1.18.42 2.1.05.9.05 1.2.05 3.6s0 2.7-.05 3.6c-.04.92-.2 1.55-.42 2.1-.23.58-.5.97-.93 1.4-.43.43-.82.7-1.4.93-.55.22-1.18.38-2.1.42-.9.05-1.2.05-3.6.05s-2.7 0-3.6-.05c-.92-.04-1.55-.20-2.1-.42-.58-.23-.97-.5-1.4-.93-.43-.43-.7.82-.93 1.4-.22.55-.38 1.18-.42 2.1-.05.9-.05 1.2-.05 3.6s0-2.7.05-3.6c.04-.92.2-1.55.42-2.1.23-.58.5-.97.93-1.4.43-.43.82-.7 1.4-.93.55-.22,1.18-.38,2.1-.42.9-.05,1.2-.05,3.6-.05Zm0-1.2c-2.43 0-2.73 0-3.68.05-1 .05-1.7.22-2.3.47-.62.24-1.15.56-1.68 1.09-.53.53-.85 1.06-1.1 1.68-.24.6-.41 1.3-.46 2.3C2.4 8.04 2.4 8.34 2.4 10.8s0 2.76.05 3.72c.05 1 .22 1.7.46 2.3.25.62.57 1.15 1.1 1.68.53.53 1.06.85 1.68 1.1.6.24 1.3.41 2.3.46.95.05 1.25.05 3.68.05s2.73 0 3.68-.05c1-.05 1.7-.22 2.3-.46.62-.25 1.15-.57 1.68-1.1.53-.53.85-1.06 1.1-1.68.24-.6.41-1.3.46-2.3.05-.95.05-1.25.05-3.68s0-2.73-.05-3.68c-.05-1-.22-1.7-.46-2.3-.25-.62-.57-1.15-1.1-1.68-.53-.53-.82-.85-1.68-1.1-.6-.24-1.3-.41-2.3-.46-.95-.05-1.25-.05-3.68-.05Z" />
                      </svg>
                    </a>
                  ) : null}
                  {shopInfo.facebook ? (
                    <a
                      href={shopInfo.facebook}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Facebook"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M13.2 20.4v-7.2h2.44l.36-2.8h-2.8V8.6c0-.8.22-1.34 1.36-1.34h1.46V4.8c-.7-.08-1.56-.12-2.42-.12-2.4 0-4.04 1.46-4.04 4.14v1.62H7.2v2.8h2.36v7.2h3.64Z" />
                      </svg>
                    </a>
                  ) : null}
                  {shopInfo.tiktok ? (
                    <a
                      href={shopInfo.tiktok}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="TikTok"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[9px] font-semibold">
                        T
                      </span>
                    </a>
                  ) : null}
                  {shopInfo.whatsapp ? (
                    <a
                      href={shopInfo.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[9px] font-semibold">
                        W
                      </span>
                    </a>
                  ) : null}
                  {shopInfo.website ? (
                    <a
                      href={shopInfo.website}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Website"
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[8px] font-semibold">
                        WWW
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveStoreLinks((prev) =>
                      prev === 'info' ? null : 'info'
                    )
                  }
                  className="rounded-full border border-[#ff2d2d] bg-transparent px-6 py-3 text-center text-base font-semibold text-[#e5e5e5] shadow-[0_0_0_rgba(255,45,45,0)] transition duration-300 hover:-translate-y-1 hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_24px_rgba(255,45,45,0.6)]"
                >
                  Download the app
                </button>
                {activeStoreLinks === 'info' ? (
                  <div className="mt-3 flex gap-2">
                    <a
                      href="https://play.google.com/store"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                    >
                      Google Play
                    </a>
                    <a
                      href="https://apps.apple.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                    >
                      App Store
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#e5e5e5]/50">Reviews</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Happy clients</h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {[shopInfo.review1, shopInfo.review2, shopInfo.review3].map(
            (review, index) => (
              <div
                key={`review-${index}`}
                className="rounded-3xl border border-[#ff2d2d]/20 bg-white/[0.03] p-6 text-[#e5e5e5]/80 shadow-[0_0_20px_rgba(255,45,45,0.15)]"
              >
                {review || 'Review coming soon.'}
              </div>
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 pb-18 sm:pb-24">
        <div className="rounded-[32px] border border-[#ff2d2d]/25 bg-black p-[1px] shadow-[0_0_24px_rgba(255,45,45,0.25)]">
          <div className="rounded-[32px] bg-black px-6 sm:px-8 py-10 sm:py-12 text-center">
            <h2 className="text-3xl font-semibold text-[#3b82f6]">Ready to book?</h2>
            <p className="mt-3 text-[#e5e5e5]/75">Download the app and book your spot.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveStoreLinks((prev) =>
                      prev === 'cta' ? null : 'cta'
                    )
                  }
                  className="rounded-full border border-[#ff2d2d] bg-transparent px-6 py-3 text-base font-semibold text-[#e5e5e5] shadow-[0_0_0_rgba(255,45,45,0)] transition duration-300 hover:-translate-y-1 hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_24px_rgba(255,45,45,0.6)]"
                >
                  Download the app
                </button>
                {activeStoreLinks === 'cta' ? (
                  <div className="mt-3 flex gap-2 justify-center">
                    <a
                      href="https://play.google.com/store"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                    >
                      Google Play
                    </a>
                    <a
                      href="https://apps.apple.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#ff2d2d]/70 px-3 py-1 text-xs text-[#e5e5e5] transition hover:bg-[#ff2d2d] hover:text-white hover:shadow-[0_0_16px_rgba(255,45,45,0.55)]"
                    >
                      App Store
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 sm:px-6 py-10">
        <div className="mx-auto grid max-w-6xl gap-6 text-sm text-[#e5e5e5]/70 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="text-[#3b82f6]">JBookMe</div>
            <div className="mt-3 space-y-1">
              <div>{shopInfo.address || 'Address coming soon'}</div>
              <div>{shopInfo.hours || 'Hours coming soon'}</div>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#e5e5e5]/50">Connect</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {shopInfo.instagram ? (
                <a
                  href={shopInfo.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Zm0 5.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm4.2-9.3a.78.78 0 1 1-1.56 0 .78.78 0 0 1 1.56 0ZM12 3.6c2.4 0 2.7 0 3.6.05.92.04 1.55.2 2.1.42.58.23.97.5 1.4.93.43.43.7.82.93 1.4.22.55.38 1.18.42 2.1.05.9.05 1.2.05 3.6s0 2.7-.05 3.6c-.04.92-.20 1.55-.42 2.1-.23.58-.5.97-.93 1.4-.43.43-.82.7-1.4.93-.55.22-1.18.38-2.1.42-.9.05-1.2.05-3.6.05s-2.7 0-3.6-.05c-.92-.04-1.55-.20-2.1-.42-.58-.23-.97-.5-1.4-.93-.43-.43-.7.82-.93 1.4-.22.55-.38 1.18-.42 2.1-.05.9-.05 1.2-.05 3.6s0-2.7.05-3.6c.04-.92.2-1.55.42-2.1.23-.58.5-.97.93-1.4.43-.43.82-.7 1.4-.93.55-.22,1.18-.38,2.1-.42.9-.05,1.2-.05,3.6-.05Zm0-1.2c-2.43 0-2.73 0-3.68.05-1 .05-1.7.22-2.3.47-.62.24-1.15.56-1.68 1.09-.53.53-.85 1.06-1.1 1.68-.24.6-.41 1.3-.46 2.3C2.4 8.04 2.4 8.34 2.4 10.8s0 2.76.05 3.72c.05 1 .22 1.7.46 2.3.25.62.57 1.15 1.1 1.68.53.53 1.06.85 1.68 1.1.6.24 1.3.41 2.3.46.95.05 1.25.05 3.68.05s2.73 0 3.68-.05c1-.05 1.7-.22 2.3-.46.62-.25 1.15-.57 1.68-1.1.53-.53.85-1.06 1.1-1.68.24-.6.41-1.3.46-2.3.05-.95.05-1.25.05-3.68s0-2.73-.05-3.68c-.05-1-.22-1.7-.46-2.3-.25-.62-.57-1.15-1.1-1.68-.53-.53-.82-.85-1.68-1.1-.6-.24-1.3-.41-2.3-.46-.95-.05-1.25-.05-3.68-.05Z" />
                  </svg>
                </a>
              ) : null}
              {shopInfo.facebook ? (
                <a
                  href={shopInfo.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M13.2 20.4v-7.2h2.44l.36-2.8h-2.8V8.6c0-.8.22-1.34 1.36-1.34h1.46V4.8c-.7-.08-1.56-.12-2.42-.12-2.4 0-4.04 1.46-4.04 4.14v1.62H7.2v2.8h2.36v7.2h3.64Z" />
                  </svg>
                </a>
              ) : null}
              {shopInfo.tiktok ? (
                <a
                  href={shopInfo.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[9px] font-semibold">
                    T
                  </span>
                </a>
              ) : null}
              {shopInfo.whatsapp ? (
                <a
                  href={shopInfo.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[9px] font-semibold">
                    W
                  </span>
                </a>
              ) : null}
              {shopInfo.website ? (
                <a
                  href={shopInfo.website}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Website"
                  className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[8px] font-semibold">
                    WWW
                  </span>
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#e5e5e5]/50">Legal</div>
            <div className="mt-3 flex flex-col gap-2">
              <a href="/privacy" className="hover:text-white">
                Privacy
              </a>
              <a href="/terms" className="hover:text-white">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
      <style jsx>{`
        .animate-hero {
          animation: heroFade 0.9s ease-out both;
        }

        @keyframes heroFade {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
