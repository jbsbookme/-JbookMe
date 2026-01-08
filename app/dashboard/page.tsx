import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  // Redirect based on role from session/JWT (avoids DB dependency on this page).
  switch (session.user.role) {
    case 'ADMIN':
      redirect('/dashboard/admin');
    case 'BARBER':
      redirect('/feed'); // Barberos también ven el feed social
    case 'CLIENT':
      redirect('/feed'); // Redirigir clientes al feed tipo Instagram
    default:
      redirect('/auth');
  }
}
