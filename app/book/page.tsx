import { BookClient } from './book-client';

export default function BookPage({ searchParams }: { searchParams: any }) {
  const barberId = String(searchParams?.barberId ?? '').trim();
  return <BookClient barberId={barberId} />;
}
