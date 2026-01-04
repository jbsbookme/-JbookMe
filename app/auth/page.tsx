"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Chrome, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useI18n } from '@/lib/i18n/i18n-context';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const rawCallbackUrl = searchParams?.get('callbackUrl') || '';
  const callbackUrl = (() => {
    if (!rawCallbackUrl) return '/dashboard';
    // Only allow internal paths.
    if (!rawCallbackUrl.startsWith('/')) return '/dashboard';
    if (rawCallbackUrl.startsWith('//')) return '/dashboard';
    return rawCallbackUrl;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          toast.error(t('auth.invalidCredentials'));
        } else {
          toast.success(t('auth.welcomeBack'));
          router.push(callbackUrl);
        }
      } else {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          toast.success(t('auth.accountCreated'));
          const result = await signIn("credentials", {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (result?.ok) {
            router.push(callbackUrl);
          }
        } else {
          const data = await res.json();
          toast.error(data.message || t('auth.signupError'));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/10 via-black to-[#ffd700]/10" />

      <Link
        href="/"
        className="absolute top-6 left-6 z-50 text-gray-400 hover:text-[#00f0ff] transition-colors duration-300"
      >
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-5 h-5" />
          {t('common.back')}
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.1)]">
          <CardHeader className="space-y-1 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mx-auto mb-4"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#ffd700] p-1 shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
                  <Image
                    src="/logo.png"
                    alt="JBookMe Logo"
                    width={80}
                    height={80}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </motion.div>

            <CardTitle className="text-3xl font-bold text-white">
              {isLogin ? t('auth.login') : t('auth.createAccount')}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isLogin ? t('auth.loginDescription') : t('auth.registerDescription')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="name" className="text-gray-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#00f0ff]" />
                      {t('auth.fullName')}
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t('auth.fullNamePlaceholder')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required={!isLogin}
                      className="mt-2 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#00f0ff]" />
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-2 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00f0ff]" />
                  {t('auth.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="mt-2 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00f0ff] focus:ring-[#00f0ff]"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300"
              >
                {isLoading ? t('auth.processing') : isLogin ? t('auth.enter') : t('auth.register')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-gray-900 border-gray-300 hover:bg-gray-100 font-semibold"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Google
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ name: "", email: "", password: "" });
                }}
                className="text-sm text-gray-400 hover:text-[#00f0ff] transition-colors duration-300"
              >
                {isLogin ? (
                  <>
                    {t('auth.noAccount')}{" "}
                    <span className="font-semibold text-[#00f0ff]">{t('auth.signUpLink')}</span>
                  </>
                ) : (
                  <>
                    {t('auth.haveAccount')}{" "}
                    <span className="font-semibold text-[#00f0ff]">{t('auth.loginLink')}</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
