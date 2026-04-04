'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  Facebook,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
} from 'lucide-react';
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
  review1Name?: string | null;
  review2Name?: string | null;
  review3Name?: string | null;
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
  const reviewAuthors = ['Marcus Lee', 'Sofia Rivera', 'Daniel Cruz'];

  const normalizeWebsiteUrl = (value?: string | null) => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
    const withoutWww = withoutProtocol.replace(/^www\./i, '');
    return `https://${withoutWww}`;
  };

  const normalizeWhatsAppUrl = (value?: string | null) => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^wa\.me\//i.test(trimmed) || /^api\.whatsapp\.com\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    return `https://wa.me/${digits}`;
  };

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
          review1Name: shopData?.review1Name ?? null,
          review2Name: shopData?.review2Name ?? null,
          review3Name: shopData?.review3Name ?? null,
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
          className="group relative overflow-hidden rounded-3xl border border-[#3b82f6]/25 bg-black p-7 transition duration-300 hover:-translate-y-2 hover:border-[#3b82f6]/60 hover:shadow-[0_0_28px_rgba(59,130,246,0.4)]"
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
            <strong className="block text-lg font-semibold text-[#ffd700]">{item.name}</strong>
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

  const whatsappUrl = normalizeWhatsAppUrl(shopInfo.whatsapp);
  const websiteUrl = normalizeWebsiteUrl(shopInfo.website);

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
            <p className="text-sm uppercase tracking-[0.35em] text-[#ffd700]">Barbers</p>
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
          <p className="text-sm uppercase tracking-[0.35em] text-[#ffd700]">Stylists</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Style specialists</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderStaff(stylists)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-[#ffd700]">Gallery</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Recent work</h2>
        </div>
        <div className="mt-8 grid gap-6 md:gap-7 grid-cols-2 lg:grid-cols-4">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-3xl border border-[#3b82f6]/25 bg-black p-3 transition duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-[#3b82f6]/60 hover:shadow-[0_0_28px_rgba(59,130,246,0.4)]"
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
        <div className="rounded-[32px] border border-[#3b82f6]/20 bg-gradient-to-b from-black via-black to-[#0a0f1f] p-6 sm:p-8 shadow-[0_0_24px_rgba(59,130,246,0.2)] md:p-12">
          <div className="text-center">
            <h2 className="mt-2 text-3xl font-semibold text-[#ffd700]">Visit us</h2>
            <div className="mt-5 grid gap-3 text-[#e5e5e5]/85">
              <div className="flex flex-col items-center gap-3 text-sm">
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3b82f6]/30">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span>{shopInfo.address || 'Coming soon'}</span>
                </div>
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3b82f6]/30">
                    <Clock className="h-4 w-4" />
                  </span>
                  <span>{shopInfo.hours || 'Daily - 9am - 8pm'}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {shopInfo.instagram ? (
                  <a
                    href={shopInfo.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3b82f6]/35 text-[#e5e5e5] transition hover:border-[#ff2d2d] hover:bg-[#ff2d2d] hover:text-[#ffd700] hover:shadow-[0_0_18px_rgba(255,45,45,0.6)]"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                ) : null}
                {shopInfo.facebook ? (
                  <a
                    href={shopInfo.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3b82f6]/35 text-[#e5e5e5] transition hover:border-[#ff2d2d] hover:bg-[#ff2d2d] hover:text-[#ffd700] hover:shadow-[0_0_18px_rgba(255,45,45,0.6)]"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                ) : null}
                {shopInfo.tiktok ? (
                  <a
                    href={shopInfo.tiktok}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="TikTok"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3b82f6]/35 text-[#e5e5e5] transition hover:border-[#ff2d2d] hover:bg-[#ff2d2d] hover:text-[#ffd700] hover:shadow-[0_0_18px_rgba(255,45,45,0.6)]"
                  >
                    <Music2 className="h-4 w-4" />
                  </a>
                ) : null}
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3b82f6]/35 text-[#e5e5e5] transition hover:border-[#ff2d2d] hover:bg-[#ff2d2d] hover:text-[#ffd700] hover:shadow-[0_0_18px_rgba(255,45,45,0.6)]"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                ) : null}
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Website"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3b82f6]/35 text-[#e5e5e5] transition hover:border-[#ff2d2d] hover:bg-[#ff2d2d] hover:text-[#ffd700] hover:shadow-[0_0_18px_rgba(255,45,45,0.6)]"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center">
              <button
                type="button"
                onClick={() =>
                  setActiveStoreLinks((prev) =>
                    prev === 'info' ? null : 'info'
                  )
                }
                className="rounded-full border border-[#ff1a1a] bg-[#ff1a1a] px-8 py-4 text-center text-base font-semibold text-[#ffd700] shadow-[0_0_18px_rgba(255,26,26,0.5)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(255,26,26,0.7)]"
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
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-[#ffd700]">Reviews</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#3b82f6]">Happy clients</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[shopInfo.review1, shopInfo.review2, shopInfo.review3].map(
            (review, index) => (
              <div
                key={`review-${index}`}
                className="rounded-3xl border border-[#3b82f6]/12 bg-black p-6 text-[#e5e5e5] transition duration-300 hover:-translate-y-2 hover:border-[#3b82f6]/45 hover:shadow-[0_0_24px_rgba(59,130,246,0.35)]"
              >
                <div className="text-[11px] tracking-[0.35em] text-[#ffd700]">
                  ★★★★★
                </div>
                <div className="mt-3 text-sm text-[#e5e5e5]/85">
                  “{review || 'Review coming soon.'}”
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.3em] text-[#e5e5e5]/60">
                  —
                  {index === 0
                    ? shopInfo.review1Name || 'Client'
                    : index === 1
                    ? shopInfo.review2Name || 'Client'
                    : shopInfo.review3Name || 'Client'}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <footer className="border-t border-white/[0.08] px-5 sm:px-6 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center text-sm text-[#e5e5e5]/70">
          <div>
            <div className="mt-3 flex items-center gap-6 text-[#ffd700]">
              <a href="/privacy" className="transition hover:text-[#3b82f6]">
                Privacy
              </a>
              <a href="/terms" className="transition hover:text-[#3b82f6]">
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
