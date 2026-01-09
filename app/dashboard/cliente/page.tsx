'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Lock, Mail, User, ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ShareFAB } from '@/components/share-fab';
import { PushNotificationButton } from '@/components/push-notification-button';
import { HistoryBackButton } from '@/components/layout/history-back-button';
import { useUser } from '@/contexts/user-context';

export default function ClienteDashboard() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const { user, updateUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      setProfileImage(user?.image || session?.user?.image || null);
      setName(user?.name || session?.user?.name || "");
      setEmail(user?.email || session?.user?.email || "");
    }
  }, [router, session, status, user?.email, user?.image, user?.name]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10MB or less");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/user/profile/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileImage(data.imageUrl);
        toast.success("Photo updated successfully");
        if (user) {
          await updateUser({ image: data.imageUrl });
        } else {
          await updateSession({ image: data.imageUrl } as Record<string, unknown>);
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Error uploading image");
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error("Error uploading image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        toast.success("Name updated successfully");
        if (user) {
          await updateUser({ name });
        } else {
          await updateSession({ name } as Record<string, unknown>);
        }
      } else {
        const data = await res.json();
        toast.error(data.message || "Error updating name");
      }
    } catch (error) {
      toast.error("Error updating name");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast.success("Email updated successfully");
        if (user) {
          await updateUser({ email });
        } else {
          await updateSession({ email } as Record<string, unknown>);
        }
      } else {
        const data = await res.json();
        toast.error(data.message || "Error updating email");
      }
    } catch (error) {
      toast.error("Error updating email");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password updated");
        setPasswords({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const data = await res.json();
        toast.error(data.message || "Error changing password");
      }
    } catch (error) {
      toast.error("Error changing password");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <HistoryBackButton
              fallbackHref="/menu"
              variant="ghost"
              size="icon"
              aria-label="Back"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </HistoryBackButton>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('client.myProfile')}</h1>
              <p className="text-gray-400">{t('client.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/inbox">
              <Button variant="outline" className="border-gray-700 hover:border-[#00f0ff] hover:text-[#00f0ff]">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Messages</span>
              </Button>
            </Link>
            <PushNotificationButton />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile */}
          <Card className="lg:col-span-1 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#00f0ff]">{t('client.personalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile photo */}
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="w-32 h-32 border-4 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                    <AvatarImage src={profileImage || undefined} />
                    <AvatarFallback className="bg-gray-800 text-white text-2xl">
                      {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <p className="text-xs text-gray-500 mt-2">{t('client.clickToChangePhoto')}</p>
              </div>

              {/* Name */}
              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00f0ff]" />
                  Name
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Your name"
                  />
                  <Button
                    onClick={handleNameUpdate}
                    disabled={isLoading}
                    className="bg-[#00f0ff] hover:bg-[#00d0dd] text-black"
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#00f0ff]" />
                  Email
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="you@example.com"
                  />
                  <Button
                    onClick={handleEmailUpdate}
                    disabled={isLoading}
                    className="bg-[#00f0ff] hover:bg-[#00d0dd] text-black"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#ffd700]">Change Password</CardTitle>
              <CardDescription className="text-gray-400">
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00f0ff]" />
                  Current Password
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00f0ff]" />
                  New Password
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00f0ff]" />
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={isLoading || !passwords.currentPassword || !passwords.newPassword}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.5)]"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Messages card */}
        <Card className="mt-6 bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-[#00f0ff]/50 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00f0ff]/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#00f0ff]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Messages</h3>
                  <p className="text-xs text-gray-400">Chat with your barber</p>
                </div>
              </div>
              <Link href="/inbox">
                <Button size="sm" className="bg-gradient-to-r from-[#00f0ff] to-cyan-400 text-black font-semibold hover:opacity-90 shadow-[0_0_15px_rgba(0,240,255,0.4)] text-xs sm:text-sm">
                  Open
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      {/* FAB Buttons */}
      <ShareFAB />
    </div>
  );
}
