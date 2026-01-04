import dynamic from 'next/dynamic';

const AdminDashboardClient = dynamic(
  () => import('./page-client').then((mod) => ({ default: mod.AdminDashboardClient })),
  { ssr: false }
);

export default function AdminDashboard() {
  return <AdminDashboardClient />;
}
