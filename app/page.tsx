import Link from "next/link";

type Barber = {
  id?: string | number;
  name?: string | null;
};

async function getBarbers() {
  try {
    const res = await fetch("https://www.jbsbookme.com/api/barbers", {
      cache: "no-store",
    });

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.barbers)) return data.barbers;
    return [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const barbers = await getBarbers();

  return (
    <main style={{ padding: 40 }}>
      <h1>JBookMe</h1>
      <div style={{ display: "grid", gap: 20, marginTop: 24 }}>
        {barbers.map((b: Barber, index: number) => (
          <div
            key={String(b.id ?? b.name ?? index)}
            style={{ border: "1px solid #333", padding: 16, borderRadius: 8 }}
          >
            <h3>{b.name ?? "Barber"}</h3>
            <Link href={`/book?barberId=${b.id ?? ""}`}>
              <button>Book</button>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
