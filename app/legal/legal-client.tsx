'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebaseClient';

type Props = {
  title: string;
  field: 'privacy' | 'terms';
};

type ShopInfo = {
  privacy?: string | null;
  terms?: string | null;
};

export function LegalClient({ title, field }: Props) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) {
          setLoading(false);
          return;
        }

        const shopRef = doc(db, 'shop', 'primary');
        const shopSnap = await getDoc(shopRef);
        const data = (shopSnap.exists() ? shopSnap.data() : {}) as ShopInfo;
        const value = (data[field] ?? '').toString();

        if (!cancelled) {
          setContent(value);
        }
      } catch {
        if (!cancelled) {
          setContent('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [field]);

  const paragraphs = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <main className="bg-black text-white">
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-[#D4AF37]">{title}</h1>
        {loading ? <p className="mt-6 text-white/60">Loading...</p> : null}
        {!loading && paragraphs.length === 0 ? (
          <p className="mt-6 text-white/60">Content coming soon.</p>
        ) : null}
        <div className="mt-6 space-y-4 text-white/70">
          {paragraphs.map((paragraph, index) => (
            <p key={`${field}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
