'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

type Barber = {
  id?: string | number;
  name?: string | null;
};

type Props = {
  barberId: string;
};

const SERVICES = ['Haircut', 'Beard', 'Fade'];

export function BookClient({ barberId }: Props) {
  const [barberName, setBarberName] = useState('Barber');
  const [service, setService] = useState('');
  const [time, setTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'confirmed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isReady = Boolean(barberId && service && time && clientName && clientPhone);

  useEffect(() => {
    let cancelled = false;

    const loadBarber = async () => {
      try {
        const res = await fetch('/api/barbers', { cache: 'no-store' });
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.barbers) ? data.barbers : [];
        const match = (list as Barber[]).find((b) => String(b.id ?? '') === barberId);

        if (!cancelled && match?.name) {
          setBarberName(match.name);
        }
      } catch {
        if (!cancelled) {
          setBarberName('Barber');
        }
      }
    };

    if (barberId) {
      void loadBarber();
    }

    return () => {
      cancelled = true;
    };
  }, [barberId]);

  const serviceOptions = useMemo(
    () =>
      SERVICES.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      )),
    []
  );

  const handleConfirm = async () => {
    if (!service || !time) {
      alert('Please select service and time');
      return;
    }

    if (!clientName || !clientPhone) {
      alert('Please enter name and phone');
      return;
    }

    setErrorMessage('');
    setSuccess(false);
    setHasError(false);
    setStatus('saving');

    try {
      await addDoc(collection(db, 'appointments'), {
        barberId,
        barberName,
        service,
        time,
        clientName,
        clientPhone,
        createdAt: new Date(),
      });
      setStatus('confirmed');
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage('Booking failed. Please try again.');
      setHasError(true);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Booking</h1>
      <p>Barber ID: {barberId || 'N/A'}</p>
      <p>Barber: {barberName}</p>

      <div style={{ marginTop: 16 }}>
        <p>Services</p>
        <ul>
          {SERVICES.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gap: 12, maxWidth: 320 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          Name
          <input
            type="text"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          Phone
          <input
            type="tel"
            value={clientPhone}
            onChange={(event) => setClientPhone(event.target.value)}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          Service
          <select value={service} onChange={(event) => setService(event.target.value)}>
            <option value="">Select a service</option>
            {serviceOptions}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Time
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>

        <button type="button" onClick={handleConfirm} disabled={!isReady || status === 'saving'}>
          {status === 'saving' ? 'Saving...' : 'Confirm Booking'}
        </button>
      </div>

      {success ? <p style={{ marginTop: 16 }}>Booking confirmed</p> : null}
      {hasError ? <p style={{ marginTop: 16 }}>{errorMessage}</p> : null}
    </div>
  );
}
