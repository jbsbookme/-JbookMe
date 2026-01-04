import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
// GoogleProvider desactivado temporalmente
// import GoogleProvider from 'next-auth/providers/google';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google SSO desactivado temporalmente - se puede reactivar más adelante
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id',
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret',
    //   allowDangerousEmailAccountLinking: true,
    // }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { barber: true },
        });

        if (!user) {
          throw new Error('Credenciales inválidas');
        }

        const passwordMatches =
          typeof user.password === 'string' &&
          user.password.length > 0 &&
          (await bcrypt.compare(credentials.password, user.password));

        if (!passwordMatches) {
          throw new Error('Credenciales inválidas');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          barberId: user.barber?.id,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.barberId = user.barberId;
      }
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
        session.user.barberId = token.barberId as string | undefined;
      }
      return session;
    },
    async signIn({ user: _user, account: _account }) {
      // Google SSO callback desactivado temporalmente
      // Se puede reactivar cuando se configuren las credenciales de Google
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};
