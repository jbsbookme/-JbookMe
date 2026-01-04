import 'next-auth';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    role?: Role | string;
    barberId?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      barberId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    barberId?: string;
  }
}
