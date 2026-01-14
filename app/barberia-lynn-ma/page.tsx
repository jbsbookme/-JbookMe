import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Barbershop in Lynn, MA | JBS Barbershop',
  description:
    'Looking for a barbershop in Lynn, MA? At JBS Barbershop we do modern haircuts, clean fades, and sharp beard trims with professional service. Book your appointment in minutes.',
};

export default function BarberiaLynnMaPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Barbershop in Lynn, MA – JBS Barbershop
          </h1>
          <p className="text-gray-300">
            In Lynn, MA, people come to JBS Barbershop for something simple: consistent
            results and professional service. If you want a clean haircut, a sharp fade,
            or a beard trim with a crisp lineup, we do it with detail and without rushing.
          </p>
        </header>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Haircuts, fades & beard trims</h2>
          <p className="text-gray-300">
            We do classic and modern cuts, taper fades, skin fades, and clean blends so
            the finish looks great from every angle. We also shape beard trims, clean up
            the outline, and refine the finish so your beard looks sharp without losing
            your style.
          </p>
          <p className="text-gray-300">
            If it's your first visit, we help you choose a style based on your hair type,
            face shape, and day-to-day routine. If you're already a client, we keep it
            consistent: same look, same level of detail.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Book your appointment in Lynn, MA</h2>
          <p className="text-gray-300">
            You can book from your phone in just a few steps. Choose the service,
            the professional, and the time that works best for you.
          </p>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/reservar">Book your haircut in Lynn MA</Link>
          </Button>
        </section>

        <section className="mt-10 border-t border-gray-800 pt-8 space-y-3">
          <h2 className="text-xl font-semibold">Why JBS Barbershop?</h2>
          <ul className="list-disc pl-5 text-gray-300 space-y-2">
            <li>Clean, symmetrical fades with smooth transitions.</li>
            <li>Beard trims with crisp outline and professional finish.</li>
            <li>We listen to what you want and execute it.</li>
            <li>Fast, convenient booking from the app.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
