import { redirect } from 'next/navigation';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

type Barber = {
  id?: string | number;
  name?: string | null;
};

async function getBarbers() {
  try {
    const res = await fetch('https://www.jbsbookme.com/api/barbers', {
      cache: 'no-store',
    });

    const data = await res.json();
    if (Array.isArray(data)) return data as Barber[];
    if (Array.isArray(data?.barbers)) return data.barbers as Barber[];
    return [] as Barber[];
  } catch {
    return [] as Barber[];
  }
}

async function createBooking(formData: FormData) {
  'use server';

  const barberId = String(formData.get('barberId') ?? '').trim();
  const service = String(formData.get('service') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();

  if (!barberId || !service || !time) {
    redirect(`/book?barberId=${encodeURIComponent(barberId)}&error=1`);
  }

  const db = getAdminFirestore();
  await db.collection('appointments').add({
    barberId,
    service,
    time,
    createdAt: new Date(),
  });

  redirect(`/book?barberId=${encodeURIComponent(barberId)}&confirmed=1`);
}

export default async function BookPage({ searchParams }: { searchParams: any }) {
  const barberId = String(searchParams?.barberId ?? '').trim();
  const barbers = await getBarbers();
  const barber = barbers.find((b) => String(b.id ?? '') === barberId);
  const barberName = barber?.name ?? 'Barber';
  const confirmed = String(searchParams?.confirmed ?? '') === '1';

  return (
    <div style={{ padding: 40 }}>
      <h1>Booking</h1>
      <p>Barber ID: {barberId || 'N/A'}</p>
      <p>Barber: {barberName}</p>

      <form action={createBooking} style={{ marginTop: 24, display: 'grid', gap: 12, maxWidth: 320 }}>
        <input type="hidden" name="barberId" value={barberId} />
        <label style={{ display: 'grid', gap: 6 }}>
          Service
          <select name="service" defaultValue="" required>
            <option value="" disabled>
              Select a service
            </option>
            <option value="Haircut">Haircut</option>
            <option value="Beard">Beard</option>
            <option value="Fade">Fade</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          Time
          <input type="time" name="time" required />
        </label>
        <button type="submit">Confirm Booking</button>
      </form>

      {confirmed ? <p style={{ marginTop: 16 }}>Booking confirmed</p> : null}
    </div>
  );
}
