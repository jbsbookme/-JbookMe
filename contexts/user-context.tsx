'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  legalAcceptedVersion?: string | null;
  legalAcceptedAt?: string | null;
  termsAccepted?: boolean | null;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
};

type UserContextType = {
  user: User | null;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data from API
  const fetchUser = async () => {
    if (!session?.user?.id) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        // For barbers, prefer profileImage over user image
        const imageUrl = data.barber?.profileImage || data.image;
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          image: imageUrl,
          legalAcceptedVersion: data.legalAcceptedVersion ?? null,
          legalAcceptedAt: data.legalAcceptedAt ?? null,
          termsAccepted: typeof data.termsAccepted === 'boolean' ? data.termsAccepted : null,
          termsVersion: data.termsVersion ?? null,
          termsAcceptedAt: data.termsAcceptedAt ?? null,
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize user when session changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUser();
    } else if (status === 'unauthenticated') {
      setUser(null);
      setIsLoading(false);
    }
  }, [status, session?.user?.id]);

  // Keep cached user in sync with NextAuth session updates (e.g. avatar change).
  useEffect(() => {
    if (status !== 'authenticated') return;

    const sessionImage = session?.user?.image ?? null;
    if (!user) return;
    if (user.image === sessionImage) return;

    setUser({ ...user, image: sessionImage });
  }, [status, session?.user?.image, user]);

  // Update user data locally and in session
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    // Update session to reflect changes
    await updateSession(updates as Record<string, unknown>);
  };

  // Refresh user from API
  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, updateUser, refreshUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
