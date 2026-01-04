export type AppRole = 'ADMIN' | 'BARBER' | 'STYLIST' | 'CLIENT' | string;

export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function isBarberOrStylist(role: AppRole | null | undefined): boolean {
  return role === 'BARBER' || role === 'STYLIST';
}

export function isClient(role: AppRole | null | undefined): boolean {
  return role === 'CLIENT';
}
