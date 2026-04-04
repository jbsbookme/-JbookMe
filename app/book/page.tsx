export default function BookPage({ searchParams }: any) {
  return (
    <div style={{ padding: 40 }}>
      <h1>Booking</h1>
      <p>Barber ID: {searchParams?.barberId}</p>
    </div>
  );
}
