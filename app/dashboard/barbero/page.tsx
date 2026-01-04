'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/i18n-context';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Calendar, Clock, Lock, Mail, User, ArrowLeft, MessageSquare, Trash2, XCircle, Star, DollarSign, CreditCard, Wallet, CalendarClock, Image as ImageIcon, Eye, Heart, QrCode, UserX, StickyNote, CheckCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Image from 'next/image';
import { ShareFAB } from '@/components/share-fab';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  paymentMethod?: string | null;
  barberNotes?: string | null;
  service: {
    name: string;
    price: number;
    duration: number;
  } | null;
  barber: {
    profileImage: string | null;
    user: {
      name: string;
      email: string;
      image: string | null;
    };
  } | null;
}

interface Post {
  id: string;
  caption?: string;
  cloud_storage_path: string;
  viewCount: number;
  createdAt: string;
  _count: {
    likedBy: number;
    comments: number;
  };
}

export default function BarberoDashboard() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [zelleQR, setZelleQR] = useState<string | null>(null);
  const [cashappQR, setCashappQR] = useState<string | null>(null);
  type BarberData = {
    zelleEmail?: string | null;
    zellePhone?: string | null;
    cashappTag?: string | null;
    [key: string]: unknown;
  };
  const [barberData, setBarberData] = useState<BarberData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState({
    zelleEmail: '',
    zellePhone: '',
    cashappTag: ''
  });
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [barberNotes, setBarberNotes] = useState<string>('');

  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      console.log('[DASHBOARD] Fetching profile...');
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        console.error('[DASHBOARD] Profile fetch failed:', res.status);
        toast.error(t('messages.error.loadProfile'));
        return;
      }

      const data = await res.json();
      console.log('[DASHBOARD] Profile data:', data);

      setBarberData(data.barber || null);

      if (data.barber) {
        setPaymentMethods({
          zelleEmail: data.barber.zelleEmail || '',
          zellePhone: data.barber.zellePhone || '',
          cashappTag: data.barber.cashappTag || ''
        });
      }

      // Para barberos, usar profileImage del barber, sino usar image del user
      if (data.barber?.profileImage) {
        console.log('[DASHBOARD] Setting barber profileImage:', data.barber.profileImage);
        setProfileImage(data.barber.profileImage);
      } else {
        console.log('[DASHBOARD] Setting user image:', data.image);
        setProfileImage(data.image || null);
      }
    } catch (error) {
      console.error("[DASHBOARD] Error fetching profile:", error);
      toast.error(t('messages.error.loadProfile'));
    }
  }, [t]);

  const fetchPosts = useCallback(async () => {
    try {
      if (!session?.user?.id) return;
      const res = await fetch(`/api/posts?authorId=${session?.user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, [session?.user?.id]);

  const fetchAppointments = useCallback(async () => {
    try {
      // Para barberos, traemos las citas donde ellos son el barbero
      const res = await fetch("/api/appointments?role=barber");

      if (!res.ok) {
        console.error('[DASHBOARD] Appointments fetch failed:', res.status);
        toast.error(t('errors.networkError'));
        return;
      }

      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error(t('errors.networkError'));
    }
  }, [t]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/auth');
      return;
    }

    if (
      status === 'authenticated' &&
      session?.user?.role !== 'BARBER' &&
      session?.user?.role !== 'STYLIST'
    ) {
      router.replace('/inicio');
      return;
    }

    if (session?.user) {
      fetchProfile();
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      fetchAppointments();
      fetchPosts();
    }
  }, [session, status, router, fetchProfile, fetchAppointments, fetchPosts]);

  const handlePermanentDelete = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to permanently delete this appointment from the database? This action CANNOT be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${appointmentId}?permanent=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success("Appointment permanently deleted");
        fetchAppointments(); // Refresh list
      } else {
        const data = await res.json();
        toast.error(data.error || "Error deleting appointment");
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error("Error deleting appointment");
    }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    // Calculate time difference
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check if less than 2 hours
    if (hoursDiff < 2) {
      toast.error(t('messages.error.cancelAppointmentTime'), {
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#fff',
        }
      });
      return;
    }

    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancellationReason: 'Cancelled by barber'
        }),
      });

      if (res.ok) {
        toast.success("✓ Appointment cancelled successfully");
        fetchAppointments(); // Refresh list
      } else {
        const data = await res.json();
        toast.error(data.error || t('messages.error.cancelAppointment'));
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error(t('messages.error.cancelAppointment'));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('messages.error.selectImage'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Keep this in sync with translation copy
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('messages.error.imageSize5MB'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/barber/profile/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileImage(data.imageUrl);
        await update();
        await fetchProfile(); // Refresh profile to get latest image
        toast.success(t('messages.success.profilePhotoUpdated'));
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || t('messages.error.uploadImage'));
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error(t('messages.error.uploadImage'));
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNameUpdate = async () => {
    if (!name.trim()) {
      toast.error(t('messages.error.nameEmpty'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/barber/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        await update();
        toast.success(t('messages.success.profileSaved'));
      } else {
        const data = await res.json();
        toast.error(data.message || t('messages.error.updateProfile'));
      }
    } catch (error) {
      toast.error(t('messages.error.updateProfile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email.trim()) {
      toast.error(t('errors.required'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t('errors.invalidEmail'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/barber/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        await update();
        toast.success(t('messages.success.profileSaved'));
      } else {
        const data = await res.json();
        toast.error(data.message || t('messages.error.updateProfile'));
      }
    } catch (error) {
      toast.error(t('messages.error.updateProfile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async (appointmentId: string) => {
    if (!newPaymentMethod) {
      toast.error(t('messages.error.selectPayment'));
      return;
    }

    if (isUpdatingPayment) return;

    setIsUpdatingPayment(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: newPaymentMethod }),
      });

      if (res.ok) {
        toast.success(t('messages.success.paymentUpdated'));
        setEditingPayment(null);
        setNewPaymentMethod('');
        fetchAppointments(); // Refresh
      } else {
        const data = await res.json();
        toast.error(data.error || t('messages.error.updatePayment'));
      }
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast.error(t('messages.error.updatePayment'));
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleMarkAsNoShow = async (appointmentId: string) => {
    if (!confirm("Mark this appointment as 'No-show'? This action is not easily reversible.")) {
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/no-show`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success("✓ Appointment marked as 'No-show'");
        fetchAppointments(); // Refresh list
      } else {
        const data = await res.json();
        toast.error(data.error || "Error marking appointment as 'No-show'");
      }
    } catch (error) {
      console.error("Error marking appointment as NO_SHOW:", error);
      toast.error("Error marking appointment as 'No-show'");
    }
  };

  const handleUpdateBarberNotes = async (appointmentId: string, notes: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberNotes: notes }),
      });

      if (res.ok) {
        toast.success("✓ Notes updated");
        fetchAppointments(); // Refresh
      } else {
        const data = await res.json();
        toast.error(data.error || "Error updating notes");
      }
    } catch (error) {
      console.error("Error updating barber notes:", error);
      toast.error("Error updating notes");
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error(t('errors.passwordMismatch'));
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error(`${t('errors.minLength')} 6`);
      return;
    }

    if (!passwords.currentPassword) {
      toast.error(t('errors.required'));
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
        toast.success(t('messages.success.profileSaved'));
        setPasswords({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const data = await res.json();
        toast.error(data.message || t('messages.error.changePassword'));
      }
    } catch (error) {
      toast.error(t('messages.error.changePassword'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowQRCodes = async () => {
    if (!barberData) {
      toast.error('Loading barber data...');
      return;
    }

    setShowQRModal(true);

    // Generate QR for Zelle if available
    if (barberData.zelleEmail || barberData.zellePhone) {
      try {
        const zelleData = barberData.zelleEmail || barberData.zellePhone;
        const res = await fetch('/api/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: zelleData }),
        });
        if (res.ok) {
          const { qr } = await res.json();
          setZelleQR(qr);
        }
      } catch (error) {
        console.error('Error generating Zelle QR:', error);
      }
    }

    // Generate QR for CashApp if available
    if (barberData.cashappTag) {
      try {
        const res = await fetch('/api/qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: barberData.cashappTag }),
        });
        if (res.ok) {
          const { qr } = await res.json();
          setCashappQR(qr);
        }
      } catch (error) {
        console.error('Error generating CashApp QR:', error);
      }
    }
  };

  const handleUpdatePaymentMethods = async () => {
    if (!paymentMethods.zelleEmail && !paymentMethods.zellePhone && !paymentMethods.cashappTag) {
      toast.error(t('errors.required'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/barber/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zelleEmail: paymentMethods.zelleEmail || null,
          zellePhone: paymentMethods.zellePhone || null,
          cashappTag: paymentMethods.cashappTag || null,
        }),
      });

      if (res.ok) {
        toast.success('Payment methods updated!');
        await fetchProfile(); // Refresh data
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error updating payment methods');
      }
    } catch (error) {
      console.error('Error updating payment methods:', error);
      toast.error('Error updating payment methods');
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
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/inicio">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{t('client.myProfile')}</h1>
              <p className="text-gray-400 text-sm">{t('client.subtitle')}</p>
            </div>
          </div>
          
          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/dashboard/barbero/horarios" className="w-full">
              <Button variant="outline" className="w-full border-gray-700 hover:border-yellow-500 hover:text-yellow-500 h-12">
                <CalendarClock className="h-4 w-4 mr-2" />
                <span>{t('barber.schedule')}</span>
              </Button>
            </Link>
            <Link href="/dashboard/barbero/contabilidad" className="w-full">
              <Button variant="outline" className="w-full border-gray-700 hover:border-yellow-500 hover:text-yellow-500 h-12">
                <DollarSign className="h-4 w-4 mr-2" />
                <span>{t('accounting.title')}</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full border-gray-700 hover:border-yellow-500 hover:text-yellow-500 h-12"
              onClick={handleShowQRCodes}
            >
              <QrCode className="h-4 w-4 mr-2" />
              <span>Payment QR</span>
            </Button>
            <Link href="/dashboard/barbero/reviews" className="w-full">
              <Button variant="outline" className="w-full border-gray-700 hover:border-yellow-500 hover:text-yellow-500 h-12">
                <Star className="h-4 w-4 mr-2" />
                <span>{t('barber.myReviews')}</span>
              </Button>
            </Link>
            <Link href="/inbox" className="w-full">
              <Button variant="outline" className="w-full border-gray-700 hover:border-yellow-500 hover:text-yellow-500 h-12">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>{t('nav.chat')}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Perfil */}
          <Card className="lg:col-span-1 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#00f0ff]">{t('client.personalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Foto de perfil */}
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => !isLoading && fileInputRef.current?.click()}>
                  <Avatar key={profileImage} className="w-32 h-32 border-4 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.3)]">
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
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-2">{t('client.clickToChangePhoto')}</p>
              </div>

              {/* Nombre */}
              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00f0ff]" />
                  {t('barber.name')}
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Tu nombre"
                  />
                  <Button
                    onClick={handleNameUpdate}
                    disabled={isLoading}
                    className="bg-[#00f0ff] hover:bg-[#00d0dd] text-black"
                  >
                    {t('common.save')}
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
                    placeholder="tu@email.com"
                  />
                  <Button
                    onClick={handleEmailUpdate}
                    disabled={isLoading}
                    className="bg-[#00f0ff] hover:bg-[#00d0dd] text-black"
                  >
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Configuration */}
          <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-green-500 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Payment Methods
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure your Zelle and CashApp for QR payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zelle Email */}
                <div>
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-500" />
                    {t('profile.zelleEmail')}
                  </Label>
                  <Input
                    type="email"
                    value={paymentMethods.zelleEmail}
                    onChange={(e) => setPaymentMethods({ ...paymentMethods, zelleEmail: e.target.value })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Zelle Phone */}
                <div>
                  <Label className="text-gray-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-500" />
                    {t('profile.zellePhone')}
                  </Label>
                  <Input
                    type="tel"
                    value={paymentMethods.zellePhone}
                    onChange={(e) => setPaymentMethods({ ...paymentMethods, zellePhone: e.target.value })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                    placeholder="+1-555-1234"
                  />
                </div>

                {/* CashApp Tag */}
                <div className="md:col-span-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    {t('profile.cashappTag')}
                  </Label>
                  <Input
                    type="text"
                    value={paymentMethods.cashappTag}
                    onChange={(e) => setPaymentMethods({ ...paymentMethods, cashappTag: e.target.value })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                    placeholder="$yourcashtag"
                  />
                </div>
              </div>

              <Button
                onClick={handleUpdatePaymentMethods}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-green-500 text-white font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              >
                {isLoading ? t('common.updating') : 'Update Payment Methods'}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Collapsible open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
            <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-[#ffd700]">{t('profile.changePassword')}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {t('profile.updatePassword')}
                    </CardDescription>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-300 hover:border-[#00f0ff] hover:text-[#00f0ff]"
                    >
                      {isChangePasswordOpen ? 'Hide' : 'Show'}
                      <ChevronDown
                        className={`ml-2 h-4 w-4 transition-transform ${isChangePasswordOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00f0ff]" />
                  {t('profile.currentPassword')}
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
                  {t('profile.newPassword')}
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
                  {t('profile.confirmPassword')}
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
                {isLoading ? t('common.updating') : t('profile.updatePasswordButton')}
              </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* My Gallery / Portfolio */}
        <Collapsible open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <Card className="mt-6 bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[#00f0ff] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    {t('barber.myGallery')}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {t('barber.workAndPosts')}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Link href="/dashboard/barbero/publicar">
                    <Button className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold">
                      <Camera className="w-4 h-4 mr-2" />
                      {t('barber.publish')}
                    </Button>
                  </Link>

                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-300 hover:border-[#00f0ff] hover:text-[#00f0ff]"
                    >
                      {isGalleryOpen ? 'Hide' : 'Show'}
                      <ChevronDown
                        className={`ml-2 h-4 w-4 transition-transform ${isGalleryOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg mb-2">{t('barber.noPosts')}</p>
                <p className="text-gray-500 text-sm mb-4">{t('barber.shareWork')}</p>
                <Link href="/dashboard/barbero/publicar">
                  <Button className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold">
                    <Camera className="w-4 h-4 mr-2" />
                    {t('barber.publishFirstWork')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {posts.slice(0, 8).map((post) => {
                  const isVideo = post.cloud_storage_path.match(/\.(mp4|webm|ogg|mov)$/i);
                  
                  return (
                  <Link 
                    key={post.id} 
                    href={`/feed`}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-[#00f0ff] transition-all"
                  >
                    {isVideo ? (
                      <video
                        src={post.cloud_storage_path}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <Image
                        src={post.cloud_storage_path}
                        alt={post.caption || 'Trabajo'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white">
                        <Heart className="w-5 h-5" />
                        <span className="font-semibold">{post._count.likedBy}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white">
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-semibold">{post._count.comments}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white">
                        <Eye className="w-5 h-5" />
                        <span className="font-semibold">{post.viewCount}</span>
                      </div>
                    </div>
                    
                    {/* Video indicator */}
                    {isVideo && (
                      <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    )}
                  </Link>
                  );
                })}
              </div>
            )}
            
            {posts.length > 8 && (
              <div className="mt-6 text-center">
                <Link href="/feed">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:border-[#00f0ff] hover:text-[#00f0ff]">
                    {t('barber.viewAllPosts')} ({posts.length})
                  </Button>
                </Link>
              </div>
            )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Historial de Citas */}
        <Collapsible open={isAppointmentsOpen} onOpenChange={setIsAppointmentsOpen}>
          <Card className="mt-6 bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[#00f0ff]">{t('barber.appointmentHistory')}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {t('barber.recentUpcoming')}
                  </CardDescription>
                </div>

                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:border-[#00f0ff] hover:text-[#00f0ff]"
                  >
                    {isAppointmentsOpen ? 'Hide' : 'Show'}
                    <ChevronDown
                      className={`ml-2 h-4 w-4 transition-transform ${isAppointmentsOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">{t('barber.noAppointments')}</p>
                <Button
                  onClick={() => window.location.href = "/reservar"}
                  className="mt-4 bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold"
                >
                  {t('common.bookAppointment')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-[#00f0ff] transition-colors"
                  >
                    {/* Header: Avatar + Info + Status (sempre visibile) */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* Barber Avatar */}
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarImage src={appointment.barber?.profileImage || undefined} />
                        <AvatarFallback className="bg-gray-700">
                          {appointment.barber?.user?.name?.charAt(0).toUpperCase() || "B"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {appointment.service?.name || t('common.service')}
                        </h4>
                        <p className="text-sm text-gray-400 truncate">
                          {t('barber.with')} {appointment.barber?.user?.name || t('barber.barber')}
                        </p>
                      </div>

                      {/* Status - Desktop only */}
                      <div className="hidden sm:block flex-shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            appointment.status === "CONFIRMED"
                              ? "bg-green-500/20 text-green-400"
                              : appointment.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {appointment.status === "CONFIRMED"
                            ? t('booking.confirmed')
                            : appointment.status === "PENDING"
                            ? t('booking.pending')
                            : t('booking.cancelled')}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Date/Time + Price + Calendar Button */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      {/* Date & Time */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(appointment.date), "dd MMM yyyy", { locale: enUS })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appointment.time}
                        </span>
                      </div>

                      {/* Status - Mobile only */}
                      <div className="sm:hidden">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            appointment.status === "CONFIRMED"
                              ? "bg-green-500/20 text-green-400"
                              : appointment.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {appointment.status === "CONFIRMED"
                            ? "✓"
                            : appointment.status === "PENDING"
                            ? "⏱"
                            : "✗"}
                        </span>
                      </div>

                      {/* Price + Action Buttons */}
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-[#ffd700]">
                          ${appointment.service?.price || 0}
                        </p>
                        
                        {/* Edit Payment Method - For completed/confirmed appointments */}
                        {(appointment.status === "COMPLETED" || appointment.status === "CONFIRMED") && (
                          <Dialog open={editingPayment === appointment.id} onOpenChange={(open) => {
                            setEditingPayment(open ? appointment.id : null);
                            if (!open) setNewPaymentMethod('');
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-black transition-colors"
                                title="Edit payment method"
                              >
                                <Wallet className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">Update Payment Method</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                  Change the payment method for this appointment if the client paid differently
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <Label className="text-gray-300 mb-2 block">Current Payment Method</Label>
                                  <p className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg">
                                    {appointment.paymentMethod || 'Not specified'}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label className="text-gray-300 mb-2 block">New Payment Method</Label>
                                  <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                      <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                      <SelectItem value="CASH" className="text-white hover:bg-gray-700">
                                        <div className="flex items-center gap-2">
                                          <DollarSign className="w-4 h-4 text-green-500" />
                                          Cash
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="CASHAPP" className="text-white hover:bg-gray-700">
                                        <div className="flex items-center gap-2">
                                          <CreditCard className="w-4 h-4 text-blue-500" />
                                          CashApp
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="ZELLE" className="text-white hover:bg-gray-700">
                                        <div className="flex items-center gap-2">
                                          <Wallet className="w-4 h-4 text-purple-500" />
                                          Zelle
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="CREDIT_CARD" className="text-white hover:bg-gray-700">
                                        <div className="flex items-center gap-2">
                                          <CreditCard className="w-4 h-4 text-yellow-500" />
                                          Tarjeta
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                  <Button
                                    onClick={() => handleUpdatePaymentMethod(appointment.id)}
                                    disabled={isUpdatingPayment || !newPaymentMethod}
                                    className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold hover:shadow-lg"
                                  >
                                    {isUpdatingPayment ? 'Updating...' : 'Update'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingPayment(null);
                                      setNewPaymentMethod('');
                                    }}
                                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {/* Calendar button for confirmed/pending */}
                        {appointment.status !== "CANCELLED" && (
                          <>
                            <AddToCalendarButton
                              appointmentId={appointment.id}
                              variant="outline"
                              size="sm"
                              showText={false}
                              appointmentData={{
                                date: appointment.date,
                                time: appointment.time,
                                service: {
                                  name: appointment.service?.name || 'Service',
                                  duration: appointment.service?.duration || 60,
                                },
                                barber: {
                                  name: appointment.barber?.user?.name || 'Barber',
                                  email: appointment.barber?.user?.email,
                                },
                                client: {
                                  name: session?.user?.name || 'Client',
                                  email: session?.user?.email || '',
                                },
                              }}
                            />
                            {/* Cancel button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelAppointment(appointment)}
                              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                              title="Cancel appointment (minimum 2 hours before)"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {/* NO_SHOW button for confirmed appointments */}
                        {(appointment.status === "CONFIRMED" || appointment.status === "PENDING") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsNoShow(appointment.id)}
                            className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white transition-colors"
                            title="Mark as 'No-show'"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Barber Notes Dialog */}
                        <Dialog open={editingNotes === appointment.id} onOpenChange={(open) => {
                          setEditingNotes(open ? appointment.id : null);
                          if (!open) setBarberNotes('');
                          else setBarberNotes(appointment.barberNotes || '');
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={appointment.barberNotes ? "border-green-500 text-green-500 hover:bg-green-500 hover:text-white" : "border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white"}
                              title={appointment.barberNotes ? "View/Edit notes" : "Add barber notes"}
                            >
                              <StickyNote className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">Barber Notes</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Add personal notes about this client (preferences, history, etc.)
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label className="text-gray-300 mb-2 block">Notes</Label>
                                <textarea
                                  value={barberNotes}
                                  onChange={(e) => setBarberNotes(e.target.value)}
                                  className="w-full min-h-[120px] bg-gray-800 border-gray-700 text-white rounded-md p-3"
                                  placeholder="E.g.: Prefers a shorter cut on the sides, regular client, allergic to..."
                                />
                              </div>
                              
                              <div className="flex gap-2 pt-4">
                                <Button
                                  onClick={() => {
                                    handleUpdateBarberNotes(appointment.id, barberNotes);
                                    setEditingNotes(null);
                                  }}
                                  className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold hover:shadow-lg"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNotes(null);
                                    setBarberNotes('');
                                  }}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {/* Delete button for cancelled appointments */}
                        {appointment.status === "CANCELLED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePermanentDelete(appointment.id)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </main>
      
      {/* Payment QR Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl flex items-center gap-2">
              <QrCode className="w-6 h-6 text-green-500" />
              Payment QR Codes
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Show these QR codes to your clients for quick payments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Zelle QR */}
            {(barberData?.zelleEmail || barberData?.zellePhone) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-400">Zelle</h3>
                  <span className="text-xs text-gray-400">
                    {barberData?.zelleEmail || barberData?.zellePhone}
                  </span>
                </div>
                {zelleQR ? (
                  <div className="bg-white p-4 rounded-lg">
                    <Image src={zelleQR} alt="Zelle QR Code" width={600} height={600} className="w-full h-auto" unoptimized />
                  </div>
                ) : (
                  <div className="bg-gray-800 p-8 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                )}
              </div>
            )}

            {/* CashApp QR */}
            {barberData?.cashappTag && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-400">CashApp</h3>
                  <span className="text-xs text-gray-400">{barberData?.cashappTag}</span>
                </div>
                {cashappQR ? (
                  <div className="bg-white p-4 rounded-lg">
                    <Image src={cashappQR} alt="CashApp QR Code" width={600} height={600} className="w-full h-auto" unoptimized />
                  </div>
                ) : (
                  <div className="bg-gray-800 p-8 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  </div>
                )}
              </div>
            )}

            {!barberData?.zelleEmail && !barberData?.zellePhone && !barberData?.cashappTag && (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No payment methods configured</p>
                <p className="text-sm text-gray-500 mt-2">Add Zelle or CashApp in your profile settings</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowQRModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* FAB Buttons */}
      <ShareFAB />
    </div>
  );
}
