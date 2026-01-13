'use client';

type Props = {
  showQuickBook?: boolean;
};

export function DashboardNavbar({ showQuickBook = false }: Props) {
  // Deprecated: header must live ONLY in app/layout.tsx (GlobalHeader).
  // Keeping this component as a no-op prevents legacy pages from rendering a second header.
  void showQuickBook;
  return null;
}