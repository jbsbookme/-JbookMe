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
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Link href="/menu">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {t('client.my')} <span className="text-[#00f0ff]">{t('client.profile')}</span>
              </h1>
              <p className="text-gray-400">{t('client.manageInfo')}</p>
            </div>
          </div>

          {/* Foto de Perfil - MEJORADA */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 mb-6 overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center">
                <Label className="text-gray-300 text-lg font-semibold mb-6 block">
                  {t('profile.profilePhoto')}
                </Label>
                
                <div className="relative inline-block mb-4">
                  <div
                    onClick={handleImageClick}
                    className="relative w-44 h-44 cursor-pointer group"
                  >
                    {/* Gradiente de borde animado */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00f0ff] via-[#ffd700] to-[#00f0ff] p-1 animate-pulse">
                      <div className="w-full h-full rounded-full overflow-hidden bg-black">
                        {image ? (
                          <Image
                            src={image}
                            alt={name || 'User'}
                            fill
                            className="object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                            <User className="w-20 h-20 text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Overlay con glassmorphism */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {uploading ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00f0ff] mb-2"></div>
                          <span className="text-white text-xs">{t('common.uploading')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Camera className="w-10 h-10 text-white mb-2" />
                          <span className="text-white text-sm font-semibold">{t('profile.changePhoto')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                <p className="text-sm text-gray-400">
                  {t('profile.clickToUpdate')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información Personal */}
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardContent className="p-8 space-y-6">
              <div>
                <Label htmlFor="name" className="text-gray-300 text-lg font-semibold mb-2 block">
                  {t('profile.fullName')} *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('profile.yourName')}
                  className="bg-[#0a0a0a] border-gray-700 text-white text-lg h-12"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-300 text-lg font-semibold mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-[#0a0a0a] border-gray-700 text-gray-500 text-lg h-12 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('profile.emailCannotModify')}
                </p>
              </div>

              <div>
                <Label htmlFor="gender" className="text-gray-300 text-lg font-semibold mb-2 block">
                  Gender
                </Label>
                <Select value={gender || ''} onValueChange={(value) => setGender(value)}>
                  <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white text-lg h-12">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-gray-700">
                    <SelectItem value="MALE" className="text-white hover:bg-gray-800">👨 Male</SelectItem>
                    <SelectItem value="FEMALE" className="text-white hover:bg-gray-800">👩 Female</SelectItem>
                    <SelectItem value="OTHER" className="text-white hover:bg-gray-800">✨ Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Helps personalize your experience
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CHAT CON BARBEROS */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 mb-6 hover:border-[#00f0ff]/30 transition-all duration-300">
            <CardContent className="p-8">
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

          {/* Botón Guardar */}
          <div className="flex justify-center">
            <Button
              onClick={handleSaveProfile}
              disabled={saving || !name.trim()}
              className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold px-12 py-6 text-lg hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {t('profile.saveProfile')}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
