'use client';

import { useEffect, useState } from 'react';
import {
  collection,
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
  instagram?: string | null;
  isActive?: boolean | null;
};

type GalleryItem = {
  id: string;
  imageUrl?: string | null;
  title?: string | null;
};

type Settings = {
  address?: string | null;
  hours?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

export function LandingClient() {
  const [barbers, setBarbers] = useState<Staff[]>([]);
  const [stylists, setStylists] = useState<Staff[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({});
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
          where('role', '==', 'barber'),
          where('isActive', '==', true)
        );
        const stylistsQuery = query(
          staffRef,
          where('role', '==', 'stylist'),
          where('isActive', '==', true)
        );

        const galleryQuery = query(
          collection(db, 'gallery'),
          orderBy('createdAt', 'desc'),
          limit(12)
        );

        const settingsQuery = query(collection(db, 'settings'), limit(1));

        const [barbersSnap, stylistsSnap, gallerySnap, settingsSnap] = await Promise.all([
          getDocs(barbersQuery),
          getDocs(stylistsQuery),
          getDocs(galleryQuery),
          getDocs(settingsQuery),
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

        const settingsDoc = settingsSnap.docs[0];
        setSettings((settingsDoc?.data() as Settings) ?? {});
      } catch {
        if (!cancelled) {
          setBarbers([]);
          setStylists([]);
          setGallery([]);
          setSettings({});
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
    if (items.length === 0) return <p>No results yet.</p>;

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {items.map((item) => {
          const image = item.imageUrl || item.photoUrl || '';
          return (
            <div key={item.id} style={{ border: '1px solid #333', padding: 16, borderRadius: 8 }}>
              <strong>{item.name}</strong>
              <div>{item.specialty || 'Specialty not listed'}</div>
              {item.instagram ? <div>@{item.instagram}</div> : null}
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={item.name}
                  style={{ marginTop: 8, width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>JBookMe</h1>
      <p>Download the app to book your appointment.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <a href="https://apps.apple.com" target="_blank" rel="noreferrer">
          App Store
        </a>
        <a href="https://play.google.com/store" target="_blank" rel="noreferrer">
          Google Play
        </a>
      </div>

      {loading ? <p style={{ marginTop: 24 }}>Loading...</p> : null}

      <section style={{ marginTop: 32 }}>
        <h2>Barbers</h2>
        {renderStaff(barbers)}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Stylists</h2>
        {renderStaff(stylists)}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Gallery</h2>
        {gallery.length === 0 ? (
          <p>No gallery items yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {gallery.map((item) => (
              <div key={item.id} style={{ border: '1px solid #333', padding: 16, borderRadius: 8 }}>
                <div>{item.title || 'Untitled'}</div>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title || 'Gallery image'}
                    style={{ marginTop: 8, width: 160, height: 160, objectFit: 'cover', borderRadius: 8 }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Info</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div>Address: {settings.address || 'N/A'}</div>
          <div>Hours: {settings.hours || 'N/A'}</div>
          {settings.instagram ? <div>Instagram: {settings.instagram}</div> : null}
          {settings.facebook ? <div>Facebook: {settings.facebook}</div> : null}
        </div>
      </section>

      <footer style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 16 }}>
        <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a>
      </footer>
    </main>
  );
}
