'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error registering user');
      }

      toast.success('Registration successful! Signing you in...');

      // Auto login after signup
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.ok) {
        router.replace('/dashboard');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error registering user';
      console.error('Registration error:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Google SSO disabled - temporarily removed
  // const handleGoogleSignIn = async () => {
  //   try {
  //     await signIn('google', { callbackUrl: '/dashboard' });
  //   } catch (error) {
  //     console.error('Google sign-in error:', error);
  //     toast.error('Error signing up with Google');
  //   }
  // };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-md animate-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-[#00f0ff] to-[#0099cc] p-4 rounded-full mb-4 neon-glow">
            <Scissors className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Premium <span className="text-[#00f0ff] neon-text">Barbershop</span>
          </h1>
          <p className="text-gray-400 text-center">Create your customer account</p>
        </div>

        <Card className="bg-[#1a1a1a] border-gray-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Create Account</CardTitle>
            <CardDescription className="text-gray-400">
              Fill out the form to sign up
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone (optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black font-semibold hover:opacity-90 transition-all neon-glow"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              {/* Google SSO disabled - can be re-enabled later */}
              {/* <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1a1a1a] px-2 text-gray-500">Or sign up with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full border-gray-700 text-white hover:bg-[#0a0a0a] hover:text-[#00f0ff] transition-colors"
              >
                <Chrome className="w-5 h-5 mr-2" />
                Google
              </Button> */}

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="text-[#00f0ff] hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-[#00f0ff] hover:bg-gray-800/50 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
