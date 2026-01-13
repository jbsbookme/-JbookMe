import type { Metadata } from 'next';

import { ApplicationForm } from './application-form';

export const metadata: Metadata = {
  title: 'Apply | JB Barbershop',
  description: 'Job application for barbers and stylists who want to join JB Barbershop.',
};

export default function AplicarPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold">Apply to work with us</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-400">
          If you are a barber or stylist and want to join the JB Barbershop team, fill out this form and we’ll get
          back to you.
        </p>

        <div className="mt-6">
          <ApplicationForm />
        </div>
      </div>
    </div>
  );
}
