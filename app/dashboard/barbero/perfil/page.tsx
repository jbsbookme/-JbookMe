'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Camera,
  Instagram,
  Facebook,
  Twitter,
  DollarSign,
  Save,
  Loader2,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface BarberProfile {
  bio?: string;
  specialties?: string;
  hourlyRate?: number;
  phone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  zelleEmail?: string;
  zellePhone?: string;
  cashappTag?: string;
  contactEmail?: string;
}

export default function BarberProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState<BarberProfile>({});
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'BARBER' && session?.user?.role !== 'STYLIST') {
      router.push('/inicio');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/barber/profile');
      const data = await res.json();
      
      if (res.ok) {
        setProfilePhotoUrl(data.profileImage || data.user?.image || null);
        setProfile({
          bio: data.bio || '',
          specialties: data.specialties || '',
          hourlyRate: data.hourlyRate || 0,
          phone: data.phone || '',
          instagramUrl: data.instagramUrl || '',
          facebookUrl: data.facebookUrl || '',
          tiktokUrl: data.tiktokUrl || '',
          zelleEmail: data.zelleEmail || '',
          zellePhone: data.zellePhone || '',
          cashappTag: data.cashappTag || '',
          contactEmail: data.contactEmail || '',
        });
        setUserName(data.user?.name || '');
        setUserEmail(data.user?.email || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const withCacheBuster = (url: string) => {
    try {
      const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      u.searchParams.set('t', String(Date.now()));
      return u.toString();
    } catch {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}t=${Date.now()}`;
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow selecting the same file again.
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/barber/profile/image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to upload image');
      }

      if (data?.imageUrl) {
        setProfilePhotoUrl(withCacheBuster(data.imageUrl));
        // Keep session-based avatars in sync across the app.
        await updateSession({ image: data.imageUrl } as Record<string, unknown>);
      }

      toast.success('Profile photo updated');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast.error(error instanceof Error ? error.message : 'Error uploading profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update barber profile
      const barberRes = await fetch('/api/barber/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!barberRes.ok) {
        const data = await barberRes.json().catch(() => ({} as any));
        throw new Error(data?.error || data?.message || 'Failed to update barber profile');
      }

      // Update user name if changed
      if (userName !== session?.user?.name) {
        const userRes = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: userName }),
        });

        if (!userRes.ok) {
          const data = await userRes.json().catch(() => ({} as any));
          throw new Error(data?.error || data?.message || 'Failed to update user name');
        }
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error instanceof Error ? error.message : 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 overflow-x-hidden">

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-4">
            <Link href="/dashboard/barbero">
              <Button
                type="button"
                variant="outline"
                className="border-gray-700 text-gray-200 hover:bg-gray-800"
              >
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your professional information</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex flex-wrap items-center gap-2 min-w-0">
                  <Camera className="w-5 h-5 text-[#00f0ff]" />
                  Profile Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative h-24 w-24 rounded-full overflow-hidden border border-gray-700 bg-transparent flex-shrink-0">
                  {profilePhotoUrl ? (
                    <Image
                      src={profilePhotoUrl}
                      alt="Profile photo"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <input
                    type="file"
                    accept="image/*"
                    id="barber-profile-photo"
                    className="hidden"
                    onChange={handleProfilePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  <label htmlFor="barber-profile-photo" className="w-full sm:w-auto inline-block">
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-black"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Change Photo
                        </>
                      )}
                    </Button>
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    JPG/PNG up to 10MB
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex flex-wrap items-center gap-2 min-w-0">
                  <User className="w-5 h-5 text-[#00f0ff]" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-white mb-2 text-sm">Name *</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">Email (Read-only)</label>
                  <Input
                    value={userEmail}
                    disabled
                    className="bg-gray-800 border-gray-700 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">Phone</label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">Contact Email</label>
                  <Input
                    value={profile.contactEmail || ''}
                    onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                    placeholder="contact@example.com"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Professional Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex flex-wrap items-center gap-2 min-w-0">
                  <DollarSign className="w-5 h-5 text-[#ffd700]" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-white mb-2 text-sm">Bio</label>
                  <Textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell clients about yourself..."
                    rows={4}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">Specialties</label>
                  <Input
                    value={profile.specialties || ''}
                    onChange={(e) => setProfile({ ...profile, specialties: e.target.value })}
                    placeholder="Fades, Designs, Beard Grooming"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <p className="text-gray-500 text-xs mt-1">Separate specialties with commas</p>
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">Hourly Rate ($)</label>
                  <Input
                    type="number"
                    value={profile.hourlyRate || ''}
                    onChange={(e) => setProfile({ ...profile, hourlyRate: parseFloat(e.target.value) || 0 })}
                    placeholder="35"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Social Media */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex flex-wrap items-center gap-2 min-w-0">
                  <Instagram className="w-5 h-5 text-purple-500" />
                  Social Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-white mb-2 text-sm flex flex-wrap items-center gap-2 min-w-0">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </label>
                  <Input
                    value={profile.instagramUrl || ''}
                    onChange={(e) => setProfile({ ...profile, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/username"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm flex flex-wrap items-center gap-2 min-w-0">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </label>
                  <Input
                    value={profile.facebookUrl || ''}
                    onChange={(e) => setProfile({ ...profile, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/username"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm flex flex-wrap items-center gap-2 min-w-0">
                    <Twitter className="w-4 h-4" />
                    TikTok
                  </label>
                  <Input
                    value={profile.tiktokUrl || ''}
                    onChange={(e) => setProfile({ ...profile, tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@username"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex flex-wrap items-center gap-2 min-w-0">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-white mb-2 text-sm">Zelle Email</label>
                  <Input
                    value={profile.zelleEmail || ''}
                    onChange={(e) => setProfile({ ...profile, zelleEmail: e.target.value })}
                    placeholder="zelle@example.com"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">Zelle Phone</label>
                  <Input
                    value={profile.zellePhone || ''}
                    onChange={(e) => setProfile({ ...profile, zellePhone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 text-sm">CashApp Tag</label>
                  <Input
                    value={profile.cashappTag || ''}
                    onChange={(e) => setProfile({ ...profile, cashappTag: e.target.value })}
                    placeholder="$username"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* View My Posts Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Link href="/dashboard/barbero/posts">
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] text-white font-bold text-lg py-6"
              >
                <Eye className="w-5 h-5 mr-2" />
                View My Posts
              </Button>
            </Link>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] text-black font-bold text-lg py-6"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
