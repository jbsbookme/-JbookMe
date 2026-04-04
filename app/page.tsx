import Link from 'next/link';
import { Button } from '@/components/ui/button';

const featuredBarbers = [
  {
    id: 'landing-1',
    name: 'JB Crew',
    specialty: 'Fades, beard, style',
  },
  {
    id: 'landing-2',
    name: 'Studio Barber',
    specialty: 'Modern cuts, line up',
  },
  {
    id: 'landing-3',
    name: 'Premium Barber',
    specialty: 'Clean finish, detail work',
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-24 h-96 w-96 rounded-full bg-[#00f0ff]/20 blur-[120px]" />
        <div className="absolute top-20 -left-24 h-96 w-96 rounded-full bg-[#ffd700]/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <section className="mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-[#00f0ff]">JBookMe</p>
        <h1 className="mt-4 text-[clamp(36px,9vw,86px)] font-bold leading-[0.95] text-white">
          Book your barber in seconds.
        </h1>
        <p className="mt-5 text-base text-gray-300 md:text-lg">
          Choose your barber, pick a time, and skip the wait.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold px-10 py-6"
          >
            <Link href="/reservar">Book Now</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-gray-500/50 text-white hover:bg-white/10 px-10 py-6"
          >
            <Link href="/barberos">Find Your Barber</Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { label: 'Instant booking', value: 'Pick a time that works for you.' },
            { label: 'Top barbers', value: 'Curated talent and verified reviews.' },
            { label: 'No waiting', value: 'Show up on time and get your seat.' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-800 bg-[#0d0d0d] p-6 text-left"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Featured</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Barbers ready to book</h2>
            <p className="mt-3 text-sm text-gray-400">
              Pick your favorite and book instantly.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-gray-700 text-white hover:bg-white/10"
          >
            <Link href="/barberos">See all barbers</Link>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          {featuredBarbers.map((barber) => (
            <div
              key={barber.id}
              className="group rounded-2xl border border-gray-800 bg-[#0f0f0f] p-6 transition-all hover:border-[#00f0ff]"
            >
              <div className="h-40 rounded-xl bg-gradient-to-b from-gray-900 to-black" />
              <div className="mt-5">
                <h3 className="text-xl font-semibold text-white">{barber.name}</h3>
                <p className="mt-2 text-sm text-gray-400">{barber.specialty}</p>
                <div className="mt-5 flex gap-3">
                  <Button asChild variant="outline" className="w-full border-gray-700 text-white hover:bg-white/10">
                    <Link href="/barberos">View</Link>
                  </Button>
                  <Button asChild className="w-full bg-[#00f0ff] text-black hover:bg-[#00d0dd]">
                    <Link href="/reservar">Book</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-800 bg-[#0b0b0b]">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h3 className="text-2xl font-semibold text-white">Ready to get started?</h3>
          <p className="mt-3 text-sm text-gray-400">
            Book your appointment now and lock your spot.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="bg-[#00f0ff] text-black hover:bg-[#00d0dd] px-10">
              <Link href="/reservar">Book Now</Link>
            </Button>
            <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-white/10 px-10">
              <Link href="/barberos">Find Your Barber</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
