export type AppRole = 'ADMIN' | 'BARBER' | 'CLIENT' | string;

export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function isBarberOrAdmin(role: AppRole | null | undefined): boolean {
  // STYLIST is treated as a barber role throughout the app.
  return role === 'BARBER' || role === 'STYLIST' || role === 'ADMIN';
}

export function isClient(role: AppRole | null | undefined): boolean {
  return role === 'CLIENT';
}
