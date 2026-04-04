import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Barber = {
  id: string;
  name: string;
  image?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  specialty?: string | null;
};

const fallbackBarbers: Barber[] = [
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

async function fetchFeaturedBarbers(): Promise<Barber[] | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const url = baseUrl ? `${baseUrl}/api/barbers` : '/api/barbers';

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      barbers?: Array<Record<string, unknown>>;
    };
    const list = Array.isArray(data.barbers) ? data.barbers : [];

    const mapped = list
      .map((barber) => {
        const user = barber.user as { name?: string | null; image?: string | null } | undefined;
        return {
          id: String(barber.id ?? ''),
          name: String(barber.name ?? user?.name ?? 'Barber'),
          image:
            (barber.imageUrl as string | null | undefined) ||
            (barber.image as string | null | undefined) ||
            (barber.profileImage as string | null | undefined) ||
            user?.image ||
            null,
          rating:
            (barber.rating as number | null | undefined) ??
            (barber.avgRating as number | null | undefined) ??
            null,
          reviewsCount:
            (barber.reviewsCount as number | null | undefined) ??
            (barber.totalReviews as number | null | undefined) ??
            null,
          specialty:
            (barber.specialty as string | null | undefined) ??
            (barber.specialties as string | null | undefined) ??
            null,
        } as Barber;
      })
      .filter((barber) => barber.id)
      .slice(0, 3);

    return mapped.length > 0 ? mapped : [];
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function LandingPage() {
  const barbers = await fetchFeaturedBarbers();
  const isLoading = barbers === null;
  const featuredBarbers = barbers && barbers.length ? barbers : fallbackBarbers;

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
            <Link href="/app/book">Book Now</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-gray-500/50 text-white hover:bg-white/10 px-10 py-6"
          >
            <Link href="/app">Find Your Barber</Link>
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
            <Link href="/app">See all barbers</Link>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          {isLoading ? (
            <div className="rounded-2xl border border-gray-800 bg-[#0f0f0f] p-6 text-center text-sm text-gray-400">
              Loading...
            </div>
          ) : null}
          {featuredBarbers.map((barber) => (
            <div
              key={barber.id}
              className="group rounded-2xl border border-gray-800 bg-[#0f0f0f] p-6 transition-all hover:border-[#00f0ff]"
            >
              <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-b from-gray-900 to-black">
                {barber.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={barber.image}
                    alt={barber.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="mt-5">
                <h3 className="text-xl font-semibold text-white">{barber.name}</h3>
                <p className="mt-2 text-sm text-gray-400">
                  {barber.specialty ?? 'Modern cuts, fades, detail work'}
                </p>
                <div className="mt-5 flex gap-3">
                  <Button asChild variant="outline" className="w-full border-gray-700 text-white hover:bg-white/10">
                    <Link href={`/app/barber/${barber.id}`}>View</Link>
                  </Button>
                  <Button asChild className="w-full bg-[#00f0ff] text-black hover:bg-[#00d0dd]">
                    <Link href={`/app/book?barberId=${barber.id}`}>Book</Link>
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
              <Link href="/app/book">Book Now</Link>
            </Button>
            <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-white/10 px-10">
              <Link href="/app">Find Your Barber</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
