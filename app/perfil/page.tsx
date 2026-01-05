'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Camera, Save, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/user-context';

export default function PerfilPage() {
  const { status } = useSession();
  const { updateUser } = useUser();
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setName(data.name || '');
        setEmail(data.email || '');
        setImage(data.image || null);
        setGender(data.gender || null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('messages.error.loadProfile'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router, fetchProfile]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[PROFILE IMAGE] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error(t('messages.error.selectImage'));
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('messages.error.imageSize5MB'));
      return;
    }

    setUploading(true);

    try {
      // Subir imagen
      const formData = new FormData();
      formData.append('image', file);

      console.log('[PROFILE IMAGE] Uploading to /api/user/profile/image...');

      const response = await fetch('/api/user/profile/image', {
        method: 'POST',
        body: formData,
      });

      console.log('[PROFILE IMAGE] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[PROFILE IMAGE] Upload successful:', data);
        
        setImage(data.imageUrl);
        
        // Update UserContext for instant sync across app
        await updateUser({ image: data.imageUrl });
        
        toast.success(t('messages.success.profilePhotoUpdated'), {
          duration: 2500,
        });
      } else {
        const error = await response.json();
        console.error('[PROFILE IMAGE] Upload failed:', error);
        toast.error(error.message || t('messages.error.uploadImage'));
      }
    } catch (error) {
      console.error('[PROFILE IMAGE] Error uploading image:', error);
      toast.error(t('messages.error.uploadImage'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error(t('messages.error.nameEmpty'));
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender }),
      });

      if (response.ok) {
        // Update UserContext
        await updateUser({ name });
        
        toast.success(t('messages.success.profileSaved'), {
          duration: 2500,
        });
        
        // Optional: stay on page instead of redirecting
        // router.push('/dashboard');
      } else {
        const error = await response.json();
        toast.error(error.message || t('messages.error.updateProfile'));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('messages.error.saveProfile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 overflow-x-hidden">
      <DashboardNavbar />

      <div className="container mx-auto px-4 pt-10 pb-8 sm:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Link href="/menu">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>

                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                    {t('client.my')} <span className="text-[#00f0ff]">{t('client.profile')}</span>
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base">{t('client.manageInfo')}</p>
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving || !name.trim()}
                className="hidden sm:inline-flex bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black font-bold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black mr-2"></div>
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('profile.saveProfile')}
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving || !name.trim()}
              className="sm:hidden w-full bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black font-bold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black mr-2"></div>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('profile.saveProfile')}
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Profile photo */}
            <Card className="bg-[#0a0a0a] border-gray-800 overflow-hidden">
              <CardContent className="p-6">
                <Label className="text-gray-300 text-sm font-semibold mb-4 block">
                  {t('profile.profilePhoto')}
                </Label>

                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={handleImageClick}
                      className="group relative h-32 w-32 rounded-full border border-gray-700 bg-black/20 overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                      aria-label={t('profile.changePhoto')}
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt={name || 'User'}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                          <User className="w-10 h-10 text-gray-500" />
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00f0ff]"></div>
                        ) : (
                          <Camera className="w-7 h-7 text-white" />
                        )}
                      </div>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  <p className="text-xs text-gray-400">{t('profile.clickToUpdate')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Personal info */}
            <Card className="bg-[#0a0a0a] border-gray-800">
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label htmlFor="name" className="text-gray-300 text-sm font-semibold mb-2 block">
                    {t('profile.fullName')} *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('profile.yourName')}
                    className="bg-black/30 border-gray-700 text-white h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-300 text-sm font-semibold mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-black/20 border-gray-800 text-gray-500 h-11 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('profile.emailCannotModify')}</p>
                </div>

                <div>
                  <Label htmlFor="gender" className="text-gray-300 text-sm font-semibold mb-2 block">
                    Gender
                  </Label>
                  <Select value={gender || ''} onValueChange={(value) => setGender(value)}>
                    <SelectTrigger className="bg-black/30 border-gray-700 text-white h-11">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-gray-700">
                      <SelectItem value="MALE" className="text-white hover:bg-gray-800">Male</SelectItem>
                      <SelectItem value="FEMALE" className="text-white hover:bg-gray-800">Female</SelectItem>
                      <SelectItem value="OTHER" className="text-white hover:bg-gray-800">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Helps personalize your experience</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CHAT CON BARBEROS */}
          <Card className="bg-[#0a0a0a] border-gray-800 mt-6 hover:border-[#00f0ff]/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{t('nav.chat')}</h3>
                    <p className="text-sm text-gray-400">{t('client.chatWithBarber')}</p>
                  </div>
                </div>
                <Link href="/inbox">
                  <Button className="bg-gradient-to-r from-[#00f0ff] to-cyan-400 text-black font-bold hover:opacity-90 shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('client.openChat')}
                  </Button>
                </Link>
              </div>
              <p className="text-gray-400 text-sm">
                {t('client.chatDescription')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
