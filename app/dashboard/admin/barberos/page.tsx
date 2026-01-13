'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Scissors, Star, Calendar, Mail, Phone, Plus, Edit2, Trash2, Upload, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter as useNextRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/i18n-context';

interface Barber {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string | null;
  hourlyRate: number | null;
  profileImage: string | null;
  isActive: boolean;
  gender: string | null;
  contactEmail: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  whatsappUrl: string | null;
  zelleEmail: string | null;
  zellePhone: string | null;
  cashappTag: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
  };
  services?: Array<unknown>;
  avgRating: number;
  _count?: {
    appointments: number;
    reviews: number;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

export default function AdminBarberosPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const nextRouter = useNextRouter();
  const { t } = useI18n();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editPreviewImage, setEditPreviewImage] = useState<string | null>(null);

  // Form state for adding new barber
  const [newBarberForm, setNewBarberForm] = useState({
    userId: '',
    name: '',
    email: '',
    password: '',
    role: 'BARBER',
    contactEmail: '',
    gender: 'MALE',
    isActive: true,
    bio: '',
    specialties: '',
    hourlyRate: '',
    profileImage: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    whatsappUrl: '',
    zelleEmail: '',
    zellePhone: '',
    cashappTag: '',
  });
  const [useExistingUser, setUseExistingUser] = useState(false);

  // Form state for editing barber
  const [editBarberForm, setEditBarberForm] = useState({
    name: '',
    contactEmail: '',
    gender: 'MALE',
    bio: '',
    specialties: '',
    hourlyRate: '',
    profileImage: '',
    isActive: true,
    zelleEmail: '',
    zellePhone: '',
    cashappTag: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    whatsappUrl: '',
  });

  const fetchBarbers = useCallback(async () => {
    try {
      // FIXED: Only load MALE barbers
      const response = await fetch('/api/barbers?gender=MALE&includeInactive=1');
      if (response.ok) {
        const data = await response.json();
        setBarbers(data.barbers || []);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
      toast.error(t('admin.barbersPage.errorLoadingBarbers'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  const toggleActive = async (barber: Barber) => {
    if (togglingActiveId) return;

    const nextIsActive = !barber.isActive;

    setTogglingActiveId(barber.id);
    setBarbers((prev) => prev.map((b) => (b.id === barber.id ? { ...b, isActive: nextIsActive } : b)));

    try {
      const response = await fetch(`/api/barbers/${barber.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || t('admin.barbersPage.failedToUpdateStatus'));
      }

      toast.success(nextIsActive ? t('admin.barbersPage.barberActivated') : t('admin.barbersPage.barberDeactivated'));
    } catch (e) {
      console.error('[AdminBarberos] toggleActive failed:', e);
      setBarbers((prev) => prev.map((b) => (b.id === barber.id ? { ...b, isActive: barber.isActive } : b)));
      toast.error(e instanceof Error ? e.message : t('admin.barbersPage.failedToUpdateStatus'));
    } finally {
      setTogglingActiveId(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/users');
      if (response.ok) {
        const data = await response.json();
        // Filter out users who are already barbers
        const barberUserIds = barbers.map((b) => b.userId);
        const availableUsers = (data.users || []).filter(
          (user: User) => !barberUserIds.includes(user.id)
        );
        setUsers(availableUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [barbers]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [router, session, status]);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return;
    fetchBarbers();
  }, [fetchBarbers, session, status]);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return;
    fetchUsers();
  }, [fetchUsers, session, status]);

  // Image upload function
  const handleImageUpload = async (file: File, isEdit = false) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('admin.barbersPage.pleaseSelectValidImage'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('admin.barbersPage.imageMustNotExceed10MB'));
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/barbers/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (isEdit) {
          setEditPreviewImage(data.url);
          setEditBarberForm({ ...editBarberForm, profileImage: data.url });
        } else {
          setPreviewImage(data.url);
          setNewBarberForm({ ...newBarberForm, profileImage: data.url });
        }
        toast.success(t('admin.barbersPage.imageUploadedSuccess'));
      } else {
        const error = await response.json();
        const message = error?.hint ? `${error.error || t('admin.barbersPage.errorUploadingImage')} ${error.hint}` : (error.error || t('admin.barbersPage.errorUploadingImage'));
        toast.error(message);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(t('admin.barbersPage.errorUploadingImage'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, isEdit);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isEdit = false) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file, isEdit);
    }
  };

  const handleAddBarber = async () => {
    // Validation
    if (useExistingUser) {
      if (!newBarberForm.userId) {
        toast.error(t('admin.barbersPage.pleaseSelectUser'));
        return;
      }
    } else {
      if (!newBarberForm.name || !newBarberForm.email) {
        toast.error(t('admin.barbersPage.completeNameAndEmail'));
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newBarberForm.email)) {
        toast.error(t('admin.barbersPage.enterValidEmail'));
        return;
      }
      // Password validation for new users
      if (!newBarberForm.password || newBarberForm.password.length < 6) {
        toast.error(t('admin.barbersPage.passwordAtLeast6Chars'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        contactEmail: newBarberForm.contactEmail || null,
        gender: newBarberForm.gender || 'MALE',
        isActive: newBarberForm.isActive,
        bio: newBarberForm.bio || null,
        specialties: newBarberForm.specialties || null,
        hourlyRate: newBarberForm.hourlyRate ? parseFloat(newBarberForm.hourlyRate) : null,
        profileImage: newBarberForm.profileImage || null,
        facebookUrl: newBarberForm.facebookUrl || null,
        instagramUrl: newBarberForm.instagramUrl || null,
        twitterUrl: newBarberForm.twitterUrl || null,
        tiktokUrl: newBarberForm.tiktokUrl || null,
        youtubeUrl: newBarberForm.youtubeUrl || null,
        whatsappUrl: newBarberForm.whatsappUrl || null,
        zelleEmail: newBarberForm.zelleEmail || null,
        zellePhone: newBarberForm.zellePhone || null,
        cashappTag: newBarberForm.cashappTag || null,
      };

      if (useExistingUser) {
        body.userId = newBarberForm.userId;
      } else {
        body.name = newBarberForm.name;
        body.email = newBarberForm.email;
        body.password = newBarberForm.password;
        body.role = newBarberForm.role;
      }

      const response = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(t('admin.barbersPage.barberAddedSuccess'));
        setIsAddDialogOpen(false);
        setNewBarberForm({
          userId: '',
          name: '',
          email: '',
          password: '',
          role: 'BARBER',
          contactEmail: '',
          gender: 'MALE',
          isActive: true,
          bio: '',
          specialties: '',
          hourlyRate: '',
          profileImage: '',
          facebookUrl: '',
          instagramUrl: '',
          twitterUrl: '',
          tiktokUrl: '',
          youtubeUrl: '',
          whatsappUrl: '',
          zelleEmail: '',
          zellePhone: '',
          cashappTag: '',
        });
        setUseExistingUser(false);
        setPreviewImage(null);
        fetchBarbers();
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.barbersPage.errorAddingBarber'));
      }
    } catch (error) {
      console.error('Error adding barber:', error);
      toast.error(t('admin.barbersPage.errorAddingBarber'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBarber = async () => {
    if (!selectedBarber) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/barbers/${selectedBarber.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editBarberForm.name || null,
          contactEmail: editBarberForm.contactEmail || null,
          gender: editBarberForm.gender || 'MALE',
          bio: editBarberForm.bio || null,
          specialties: editBarberForm.specialties || null,
          hourlyRate: editBarberForm.hourlyRate ? parseFloat(editBarberForm.hourlyRate) : null,
          profileImage: editBarberForm.profileImage || null,
          isActive: editBarberForm.isActive,
          facebookUrl: editBarberForm.facebookUrl || null,
          instagramUrl: editBarberForm.instagramUrl || null,
          twitterUrl: editBarberForm.twitterUrl || null,
          tiktokUrl: editBarberForm.tiktokUrl || null,
          youtubeUrl: editBarberForm.youtubeUrl || null,
          whatsappUrl: editBarberForm.whatsappUrl || null,
          zelleEmail: editBarberForm.zelleEmail || null,
          zellePhone: editBarberForm.zellePhone || null,
          cashappTag: editBarberForm.cashappTag || null,
        }),
      });

      if (response.ok) {
        toast.success(t('admin.barbersPage.barberUpdatedSuccess'));
        setIsEditDialogOpen(false);
        setSelectedBarber(null);
        fetchBarbers();
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.barbersPage.errorUpdatingBarber'));
      }
    } catch (error) {
      console.error('Error updating barber:', error);
      toast.error(t('admin.barbersPage.errorUpdatingBarber'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBarber = async () => {
    if (!selectedBarber) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/barbers/${selectedBarber.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('admin.barbersPage.barberDeletedSuccess'));
        setIsDeleteDialogOpen(false);
        setSelectedBarber(null);
        fetchBarbers();
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.barbersPage.errorDeletingBarber'));
      }
    } catch (error) {
      console.error('Error deleting barber:', error);
      toast.error(t('admin.barbersPage.errorDeletingBarber'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (barber: Barber) => {
    setSelectedBarber(barber);
    setEditBarberForm({
      name: barber.user?.name || '',
      contactEmail: barber.contactEmail || '',
      gender: barber.gender || 'MALE',
      bio: barber.bio || '',
      specialties: barber.specialties || '',
      hourlyRate: barber.hourlyRate?.toString() || '',
      profileImage: barber.profileImage || '',
      isActive: barber.isActive,
      zelleEmail: barber.zelleEmail || '',
      zellePhone: barber.zellePhone || '',
      cashappTag: barber.cashappTag || '',
      facebookUrl: barber.facebookUrl || '',
      instagramUrl: barber.instagramUrl || '',
      twitterUrl: barber.twitterUrl || '',
      tiktokUrl: barber.tiktokUrl || '',
      youtubeUrl: barber.youtubeUrl || '',
      whatsappUrl: barber.whatsappUrl || '',
    });
    setEditPreviewImage(barber.profileImage || null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (barber: Barber) => {
    setSelectedBarber(barber);
    setIsDeleteDialogOpen(true);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button
            onClick={() => nextRouter.push('/dashboard/admin')}
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
            aria-label={t('admin.barbersPage.backToDashboardAria')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              <span className="text-[#00f0ff]">{t('admin.barbersPage.titleEntity')}</span> {t('admin.barbersPage.titleSuffix')}
            </h1>
            <p className="text-gray-400">{t('admin.barbersPage.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => nextRouter.push('/dashboard/admin/estilistas')}
            >
              {t('admin.barbersPage.viewStylistsButton')}
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.barbersPage.addBarberButton')}
            </Button>
          </div>
        </div>

        {barbers.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="py-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">{t('admin.barbersPage.emptyNoBarbers')}</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.barbersPage.emptyAddFirstBarber')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => (
              <Card
                key={barber.id}
                className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff] transition-all duration-300"
              >
                <CardContent className="p-6">
                  {/* Profile Image */}
                  <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                    {barber.user?.image || barber.profileImage ? (
                      <Image
                        src={barber.user?.image || barber.profileImage || ''}
                        alt={barber.user?.name || t('common.barber')}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Scissors className="w-20 h-20 text-[#00f0ff]/30" />
                      </div>
                    )}
                  </div>

                  {/* Barber Info */}
                  <h3 className="text-xl font-bold text-white mb-1">
                    {barber.user?.name || t('common.barber')}
                  </h3>
                  {barber.specialties && (
                    <p className="text-[#00f0ff] text-sm mb-3">{barber.specialties}</p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {barber.user?.email && (
                      <div className="flex items-center text-gray-400 text-sm">
                        <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{barber.user.email}</span>
                      </div>
                    )}
                    {barber.user?.phone && (
                      <div className="flex items-center text-gray-400 text-sm">
                        <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                        {barber.user.phone}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 pt-4 border-t border-gray-800 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{t('admin.barbersPage.statsRating')}</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-[#ffd700] fill-current mr-1" />
                        <span className="text-[#ffd700] font-semibold">
                          {barber.avgRating > 0 ? barber.avgRating : t('common.notAvailable')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{t('admin.barbersPage.statsAppointments')}</span>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-[#00f0ff] mr-1" />
                        <span className="text-white font-semibold">
                          {barber._count?.appointments || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{t('admin.barbersPage.statsServices')}</span>
                      <span className="text-white font-semibold">
                        {barber.services?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{t('admin.barbersPage.statsHourlyRate')}</span>
                      <span className="text-[#ffd700] font-semibold">
                        {barber.hourlyRate ? `$${barber.hourlyRate}` : t('common.notAvailable')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{t('admin.barbersPage.statsStatus')}</span>
                      <button
                        type="button"
                        disabled={togglingActiveId === barber.id}
                        onClick={() => toggleActive(barber)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-opacity ${
                          barber.isActive
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        } ${togglingActiveId === barber.id ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                      >
                        {barber.isActive ? t('admin.barbersPage.statusActive') : t('admin.barbersPage.statusInactive')}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditDialog(barber)}
                      variant="outline"
                      className="flex-1 border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      onClick={() => openDeleteDialog(barber)}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Barber Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#00f0ff]">{t('admin.barbersPage.addDialogTitle')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('admin.barbersPage.addDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Toggle between new user and existing user */}
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="useExistingUser"
                checked={useExistingUser}
                onChange={(e) => setUseExistingUser(e.target.checked)}
                className="w-4 h-4 text-[#00f0ff] bg-[#0a0a0a] border-gray-700 rounded focus:ring-[#00f0ff]"
              />
              <Label htmlFor="useExistingUser" className="text-gray-300">
                {t('admin.barbersPage.useExistingUserLabel')}
              </Label>
            </div>

            {useExistingUser ? (
              <div>
                <Label htmlFor="userId" className="text-gray-300">{t('admin.barbersPage.userLabelRequired')}</Label>
                <select
                  id="userId"
                  value={newBarberForm.userId}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, userId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
                >
                  <option value="">{t('admin.barbersPage.selectUserOption')}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="name" className="text-gray-300">{t('admin.barbersPage.fullNameLabelRequired')}</Label>
                  <Input
                    id="name"
                    value={newBarberForm.name}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, name: e.target.value })}
                    placeholder={t('admin.barbersPage.fullNamePlaceholder')}
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-300">{t('admin.barbersPage.emailLabelRequired')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newBarberForm.email}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, email: e.target.value })}
                    placeholder={t('admin.barbersPage.emailPlaceholder')}
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-300">{t('admin.barbersPage.passwordLabelRequired')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newBarberForm.password}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, password: e.target.value })}
                    placeholder={t('admin.barbersPage.passwordPlaceholder')}
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('admin.barbersPage.passwordHelp')}</p>
                </div>
                
                <div>
                  <Label htmlFor="role" className="text-gray-300">{t('admin.barbersPage.userRoleLabel')}</Label>
                  <Select
                    value={newBarberForm.role}
                    onValueChange={(value) => setNewBarberForm({ ...newBarberForm, role: value })}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="BARBER">{t('admin.barbersPage.roleBarber')}</SelectItem>
                      <SelectItem value="CLIENT">{t('admin.barbersPage.roleClient')}</SelectItem>
                      <SelectItem value="ADMIN">{t('admin.barbersPage.roleAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">{t('admin.barbersPage.userRoleHelp')}</p>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="contactEmail" className="text-gray-300">{t('admin.barbersPage.contactEmailLabel')}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={newBarberForm.contactEmail}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, contactEmail: e.target.value })}
                placeholder={t('admin.barbersPage.contactEmailPlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">{t('admin.barbersPage.contactEmailHelp')}</p>
            </div>

            {/* REMOVED: Gender selector - This page only manages MALE barbers */}
            <input type="hidden" name="gender" value="MALE" />
            
            <div>
              <Label htmlFor="specialties" className="text-gray-300">{t('admin.barbersPage.specialtiesLabel')}</Label>
              <Input
                id="specialties"
                value={newBarberForm.specialties}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, specialties: e.target.value })}
                placeholder={t('admin.barbersPage.specialtiesPlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="hourlyRate" className="text-gray-300">{t('admin.barbersPage.hourlyRateLabel')}</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={newBarberForm.hourlyRate}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, hourlyRate: e.target.value })}
                placeholder={t('admin.barbersPage.hourlyRatePlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="bio" className="text-gray-300">{t('admin.barbersPage.biographyLabel')}</Label>
              <Textarea
                id="bio"
                value={newBarberForm.bio}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, bio: e.target.value })}
                placeholder={t('admin.barbersPage.biographyPlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>

            {/* Social Media Links */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-gray-300 font-semibold mb-2">{t('admin.barbersPage.socialLinksTitleOptional')}</h3>
              
              <div>
                <Label htmlFor="facebookUrl" className="text-gray-400 text-sm">Facebook</Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  value={newBarberForm.facebookUrl}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="instagramUrl" className="text-gray-400 text-sm">Instagram</Label>
                <Input
                  id="instagramUrl"
                  type="url"
                  value={newBarberForm.instagramUrl}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="twitterUrl" className="text-gray-400 text-sm">Twitter / X</Label>
                <Input
                  id="twitterUrl"
                  type="url"
                  value={newBarberForm.twitterUrl}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, twitterUrl: e.target.value })}
                  placeholder="https://twitter.com/usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="tiktokUrl" className="text-gray-400 text-sm">TikTok</Label>
                <Input
                  id="tiktokUrl"
                  type="url"
                  value={newBarberForm.tiktokUrl}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, tiktokUrl: e.target.value })}
                  placeholder="https://tiktok.com/@usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="youtubeUrl" className="text-gray-400 text-sm">YouTube</Label>
                <Input
                  id="youtubeUrl"
                  type="url"
                  value={newBarberForm.youtubeUrl}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/@usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="whatsappUrl" className="text-gray-400 text-sm">WhatsApp</Label>
                <Input
                  id="whatsappUrl"
                  type="url"
                  value={newBarberForm.whatsappUrl}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, whatsappUrl: e.target.value })}
                  placeholder="https://wa.me/1234567890"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-gray-300 font-semibold mb-2">{t('admin.barbersPage.paymentMethodsTitle')}</h3>
              <p className="text-xs text-gray-500 mb-3">{t('admin.barbersPage.paymentMethodsDescription')}</p>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-sm">
                    Z
                  </div>
                  <h4 className="text-purple-400 font-semibold">Zelle</h4>
                </div>
                
                <div>
                  <Label htmlFor="zelleEmail" className="text-gray-400 text-sm">{t('admin.barbersPage.zelleEmailLabel')}</Label>
                  <Input
                    id="zelleEmail"
                    type="email"
                    value={newBarberForm.zelleEmail}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, zelleEmail: e.target.value })}
                    placeholder="ejemplo@email.com"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="zellePhone" className="text-gray-400 text-sm">{t('admin.barbersPage.zellePhoneLabel')}</Label>
                  <Input
                    id="zellePhone"
                    type="tel"
                    value={newBarberForm.zellePhone}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, zellePhone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-sm">
                    $
                  </div>
                  <h4 className="text-green-400 font-semibold">Cash App</h4>
                </div>
                
                <div>
                  <Label htmlFor="cashappTag" className="text-gray-400 text-sm">$Cashtag</Label>
                  <Input
                    id="cashappTag"
                    value={newBarberForm.cashappTag}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, cashappTag: e.target.value })}
                    placeholder="$username"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-600 mt-1">{t('admin.barbersPage.cashAppHelp')}</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">{t('admin.barbersPage.profileImageLabel')}</Label>
              {previewImage ? (
                <div className="relative mt-2">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900">
                    <Image
                      src={previewImage}
                      alt={t('admin.barbersPage.profileImagePreviewAlt')}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setNewBarberForm({ ...newBarberForm, profileImage: '' });
                    }}
                    variant="outline"
                    className="mt-2 w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('admin.barbersPage.removeImageButton')}
                  </Button>
                </div>
              ) : (
                <div
                  onDrop={(e) => handleDrop(e, false)}
                  onDragOver={(e) => e.preventDefault()}
                  className="mt-2 border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-[#00f0ff] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, false)}
                    className="hidden"
                    id="barber-image-upload"
                  />
                  <label htmlFor="barber-image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">
                      {uploadingImage ? t('admin.barbersPage.uploading') : t('admin.barbersPage.dragOrClickToSelect')}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">{t('admin.barbersPage.max10MB')}</p>
                  </label>
                </div>
              )}
              <div className="mt-2">
                <Label htmlFor="profileImage-url" className="text-gray-500 text-xs">{t('admin.barbersPage.orEnterUrlOptional')}</Label>
                <Input
                  id="profileImage-url"
                  value={newBarberForm.profileImage}
                  onChange={(e) => {
                    setNewBarberForm({ ...newBarberForm, profileImage: e.target.value });
                    setPreviewImage(e.target.value);
                  }}
                  placeholder="https://images.pexels.com/photos/2076930/pexels-photo-2076930.jpeg?cs=srgb&dl=pexels-thgusstavo-2076930.jpg&fm=jpg"
                  className="bg-[#0a0a0a] border-gray-700 text-white text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsAddDialogOpen(false)}
              variant="outline"
              className="border-gray-700 text-gray-300"
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddBarber}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? t('admin.barbersPage.adding') : t('admin.barbersPage.addBarberButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Barber Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#00f0ff]">{t('admin.barbersPage.editDialogTitle')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('admin.barbersPage.editDialogDescriptionPrefix')}
              {selectedBarber?.user?.name}
              {t('admin.barbersPage.editDialogDescriptionSuffix')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-gray-300">{t('admin.barbersPage.editNameLabel')}</Label>
              <Input
                id="edit-name"
                value={editBarberForm.name}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, name: e.target.value })}
                placeholder={t('admin.barbersPage.editNamePlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-contactEmail" className="text-gray-300">{t('admin.barbersPage.contactEmailLabel')}</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={editBarberForm.contactEmail}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, contactEmail: e.target.value })}
                placeholder={t('admin.barbersPage.contactEmailPlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">{t('admin.barbersPage.contactEmailHelp')}</p>
            </div>

            {/* REMOVED: Gender selector - This page only manages MALE barbers */}
            <input type="hidden" name="edit-gender" value="MALE" />
            
            <div>
              <Label htmlFor="edit-specialties" className="text-gray-300">{t('admin.barbersPage.specialtiesLabel')}</Label>
              <Input
                id="edit-specialties"
                value={editBarberForm.specialties}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, specialties: e.target.value })}
                placeholder={t('admin.barbersPage.specialtiesPlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-hourlyRate" className="text-gray-300">{t('admin.barbersPage.hourlyRateLabel')}</Label>
              <Input
                id="edit-hourlyRate"
                type="number"
                value={editBarberForm.hourlyRate}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, hourlyRate: e.target.value })}
                placeholder={t('admin.barbersPage.hourlyRatePlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-bio" className="text-gray-300">{t('admin.barbersPage.biographyLabel')}</Label>
              <Textarea
                id="edit-bio"
                value={editBarberForm.bio}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, bio: e.target.value })}
                  placeholder={t('admin.barbersPage.biographyPlaceholder')}
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>

            {/* Social Media Links */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-gray-300 font-semibold mb-2">{t('admin.barbersPage.socialLinksTitleOptional')}</h3>
              
              <div>
                <Label htmlFor="edit-facebookUrl" className="text-gray-400 text-sm">Facebook</Label>
                <Input
                  id="edit-facebookUrl"
                  type="url"
                  value={editBarberForm.facebookUrl}
                  onChange={(e) => setEditBarberForm({ ...editBarberForm, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-instagramUrl" className="text-gray-400 text-sm">Instagram</Label>
                <Input
                  id="edit-instagramUrl"
                  type="url"
                  value={editBarberForm.instagramUrl}
                  onChange={(e) => setEditBarberForm({ ...editBarberForm, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-twitterUrl" className="text-gray-400 text-sm">Twitter / X</Label>
                <Input
                  id="edit-twitterUrl"
                  type="url"
                  value={editBarberForm.twitterUrl}
                  onChange={(e) => setEditBarberForm({ ...editBarberForm, twitterUrl: e.target.value })}
                  placeholder="https://twitter.com/usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-tiktokUrl" className="text-gray-400 text-sm">TikTok</Label>
                <Input
                  id="edit-tiktokUrl"
                  type="url"
                  value={editBarberForm.tiktokUrl}
                  onChange={(e) => setEditBarberForm({ ...editBarberForm, tiktokUrl: e.target.value })}
                  placeholder="https://tiktok.com/@usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-youtubeUrl" className="text-gray-400 text-sm">YouTube</Label>
                <Input
                  id="edit-youtubeUrl"
                  type="url"
                  value={editBarberForm.youtubeUrl}
                  onChange={(e) => setEditBarberForm({ ...editBarberForm, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/@usuario"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="edit-whatsappUrl" className="text-gray-400 text-sm">WhatsApp</Label>
                <Input
                  id="edit-whatsappUrl"
                  type="url"
                  value={editBarberForm.whatsappUrl}
                  onChange={(e) => setEditBarberForm({ ...editBarberForm, whatsappUrl: e.target.value })}
                  placeholder="https://wa.me/1234567890"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-gray-300 font-semibold mb-2">{t('admin.barbersPage.paymentMethodsTitle')}</h3>
              <p className="text-xs text-gray-500 mb-3">{t('admin.barbersPage.paymentMethodsDescription')}</p>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-sm">
                    Z
                  </div>
                  <h4 className="text-purple-400 font-semibold">Zelle</h4>
                </div>
                
                <div>
                  <Label htmlFor="edit-zelleEmail" className="text-gray-400 text-sm">{t('admin.barbersPage.zelleEmailLabel')}</Label>
                  <Input
                    id="edit-zelleEmail"
                    type="email"
                    value={editBarberForm.zelleEmail}
                    onChange={(e) => setEditBarberForm({ ...editBarberForm, zelleEmail: e.target.value })}
                    placeholder="ejemplo@email.com"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-zellePhone" className="text-gray-400 text-sm">{t('admin.barbersPage.zellePhoneLabel')}</Label>
                  <Input
                    id="edit-zellePhone"
                    type="tel"
                    value={editBarberForm.zellePhone}
                    onChange={(e) => setEditBarberForm({ ...editBarberForm, zellePhone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-sm">
                    $
                  </div>
                  <h4 className="text-green-400 font-semibold">Cash App</h4>
                </div>
                
                <div>
                  <Label htmlFor="edit-cashappTag" className="text-gray-400 text-sm">$Cashtag</Label>
                  <Input
                    id="edit-cashappTag"
                    value={editBarberForm.cashappTag}
                    onChange={(e) => setEditBarberForm({ ...editBarberForm, cashappTag: e.target.value })}
                    placeholder="$username"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-600 mt-1">{t('admin.barbersPage.cashAppHelp')}</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">{t('admin.barbersPage.profileImageLabel')}</Label>
              {editPreviewImage ? (
                <div className="relative mt-2">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900">
                    <Image
                      src={editPreviewImage}
                      alt={t('admin.barbersPage.profileImagePreviewAlt')}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditPreviewImage(null);
                      setEditBarberForm({ ...editBarberForm, profileImage: '' });
                    }}
                    variant="outline"
                    className="mt-2 w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('admin.barbersPage.deleteImageButton')}
                  </Button>
                </div>
              ) : (
                <div
                  onDrop={(e) => handleDrop(e, true)}
                  onDragOver={(e) => e.preventDefault()}
                  className="mt-2 border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-[#00f0ff] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, true)}
                    className="hidden"
                    id="edit-barber-image-upload"
                  />
                  <label htmlFor="edit-barber-image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">
                      {uploadingImage ? t('admin.barbersPage.uploading') : t('admin.barbersPage.dragOrClickToSelect')}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">{t('admin.barbersPage.max10MB')}</p>
                  </label>
                </div>
              )}
              <div className="mt-2">
                <Label htmlFor="edit-profileImage-url" className="text-gray-500 text-xs">{t('admin.barbersPage.orEnterUrlOptional')}</Label>
                <Input
                  id="edit-profileImage-url"
                  value={editBarberForm.profileImage}
                  onChange={(e) => {
                    setEditBarberForm({ ...editBarberForm, profileImage: e.target.value });
                    setEditPreviewImage(e.target.value);
                  }}
                  placeholder="https://i.pinimg.com/474x/1a/8a/d8/1a8ad8a81299dd60695edcd51aa0e592.jpg"
                  className="bg-[#0a0a0a] border-gray-700 text-white text-xs"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editBarberForm.isActive}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, isActive: e.target.checked })}
                className="w-4 h-4 text-[#00f0ff] bg-[#0a0a0a] border-gray-700 rounded focus:ring-[#00f0ff]"
              />
              <Label htmlFor="edit-isActive" className="text-gray-300">{t('admin.barbersPage.activeBarberLabel')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              className="border-gray-700 text-gray-300"
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleEditBarber}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? t('admin.barbersPage.saving') : t('admin.barbersPage.saveChangesButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Barber Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">{t('admin.barbersPage.deleteDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t('admin.barbersPage.deleteDialogConfirm')} <span className="text-white font-semibold">{selectedBarber?.user?.name}</span>? 
              <br/><br/>
              <span className="text-red-400 font-semibold">{t('admin.barbersPage.deleteDialogIrreversible')}</span>
              <br/><br/>
              {t('admin.barbersPage.deleteDialogDeletedIntro')}
              <ul className="list-disc list-inside mt-2 text-gray-300 space-y-1">
                <li>{t('admin.barbersPage.deleteItemProfile')}</li>
                <li>{t('admin.barbersPage.deleteItemSchedule')}</li>
                <li>{t('admin.barbersPage.deleteItemGallery')}</li>
                <li>{t('admin.barbersPage.deleteItemPaymentHistory')}</li>
                <li><span className="text-red-400">{t('admin.barbersPage.deleteItemAppointmentsCancelled')}</span></li>
                <li>{t('admin.barbersPage.deleteItemReviews')}</li>
                <li><span className="text-red-400 font-semibold">{t('admin.barbersPage.deleteItemUserAccount')}</span></li>
              </ul>
              <br/>
              <span className="text-red-400 font-semibold">{t('admin.barbersPage.deleteDialogWarningLabel')}</span> {t('admin.barbersPage.deleteDialogWarningText')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800" disabled={submitting}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBarber}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={submitting}
            >
              {submitting ? t('admin.barbersPage.deleting') : t('admin.barbersPage.deleteDialogConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
