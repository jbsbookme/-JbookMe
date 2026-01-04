'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNavbar } from '@/components/dashboard/navbar';
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
      const response = await fetch('/api/barbers?gender=MALE');
      if (response.ok) {
        const data = await response.json();
        setBarbers(data.barbers || []);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
      toast.error('Error loading barbers');
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.error('Please select a valid image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must not exceed 10MB');
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
        toast.success('Image uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error uploading image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
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
        toast.error('Please select a user');
        return;
      }
    } else {
      if (!newBarberForm.name || !newBarberForm.email) {
        toast.error('Please complete name and email');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newBarberForm.email)) {
        toast.error('Please enter a valid email');
        return;
      }
      // Password validation for new users
      if (!newBarberForm.password || newBarberForm.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        contactEmail: newBarberForm.contactEmail || null,
        gender: newBarberForm.gender || 'MALE',
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
        toast.success('Barber added successfully');
        setIsAddDialogOpen(false);
        setNewBarberForm({
          userId: '',
          name: '',
          email: '',
          password: '',
          role: 'BARBER',
          contactEmail: '',
          gender: 'MALE',
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
        toast.error(error.error || 'Error adding barber');
      }
    } catch (error) {
      console.error('Error adding barber:', error);
      toast.error('Error adding barber');
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
        toast.success('Barber updated successfully');
        setIsEditDialogOpen(false);
        setSelectedBarber(null);
        fetchBarbers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error updating barber');
      }
    } catch (error) {
      console.error('Error updating barber:', error);
      toast.error('Error updating barber');
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
        toast.success('Barber deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedBarber(null);
        fetchBarbers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error deleting barber');
      }
    } catch (error) {
      console.error('Error deleting barber:', error);
      toast.error('Error deleting barber');
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
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button
            onClick={() => nextRouter.push('/dashboard/admin')}
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              <span className="text-[#00f0ff]">Barbers</span> Management (Men)
            </h1>
            <p className="text-gray-400">Manage your team of barbers who serve men</p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Barber
          </Button>
        </div>

        {barbers.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="py-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No barbers registered</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add first barber
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
                        alt={barber.user?.name || 'Barber'}
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
                    {barber.user?.name || 'Barber'}
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
                      <span className="text-gray-400">Rating</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-[#ffd700] fill-current mr-1" />
                        <span className="text-[#ffd700] font-semibold">
                          {barber.avgRating > 0 ? barber.avgRating : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Appointments</span>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-[#00f0ff] mr-1" />
                        <span className="text-white font-semibold">
                          {barber._count?.appointments || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Services</span>
                      <span className="text-white font-semibold">
                        {barber.services?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Hourly Rate</span>
                      <span className="text-[#ffd700] font-semibold">
                        {barber.hourlyRate ? `$${barber.hourlyRate}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          barber.isActive
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {barber.isActive ? 'Active' : 'Inactive'}
                      </span>
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
                      Edit
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
            <DialogTitle className="text-[#00f0ff]">Add New Barber</DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete the new barber&apos;s information
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
                Use existing user
              </Label>
            </div>

            {useExistingUser ? (
              <div>
                <Label htmlFor="userId" className="text-gray-300">User *</Label>
                <select
                  id="userId"
                  value={newBarberForm.userId}
                  onChange={(e) => setNewBarberForm({ ...newBarberForm, userId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
                >
                  <option value="">Select user</option>
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
                  <Label htmlFor="name" className="text-gray-300">Full Name *</Label>
                  <Input
                    id="name"
                    value={newBarberForm.name}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, name: e.target.value })}
                    placeholder="E.g: Juan Perez"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-300">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newBarberForm.email}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, email: e.target.value })}
                    placeholder="Ej: juan@ejemplo.com"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-300">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newBarberForm.password}
                    onChange={(e) => setNewBarberForm({ ...newBarberForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Password to access the system</p>
                </div>
                
                <div>
                  <Label htmlFor="role" className="text-gray-300">User Role</Label>
                  <Select 
                    value={newBarberForm.role} 
                    onValueChange={(value) => setNewBarberForm({ ...newBarberForm, role: value })}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="BARBER">Barber</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                    <p className="text-xs text-gray-500 mt-1">Define the user&apos;s access level</p>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="contactEmail" className="text-gray-300">Barber&apos;s Personal Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={newBarberForm.contactEmail}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, contactEmail: e.target.value })}
                placeholder="E.g.: adolfoboome@gmail.com"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Personal email for contact and notifications</p>
            </div>

            {/* REMOVED: Gender selector - This page only manages MALE barbers */}
            <input type="hidden" name="gender" value="MALE" />
            
            <div>
              <Label htmlFor="specialties" className="text-gray-300">Specialties</Label>
              <Input
                id="specialties"
                value={newBarberForm.specialties}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, specialties: e.target.value })}
                placeholder="E.g: Classic cuts, Beard, Design"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="hourlyRate" className="text-gray-300">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={newBarberForm.hourlyRate}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, hourlyRate: e.target.value })}
                placeholder="25"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="bio" className="text-gray-300">Biography</Label>
              <Textarea
                id="bio"
                value={newBarberForm.bio}
                onChange={(e) => setNewBarberForm({ ...newBarberForm, bio: e.target.value })}
                placeholder="Describe the barber&apos;s experience and style..."
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>

            {/* Social Media Links */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-gray-300 font-semibold mb-2">Redes Sociales (opcional)</h3>
              
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
              <h3 className="text-gray-300 font-semibold mb-2">Payment Methods</h3>
              <p className="text-xs text-gray-500 mb-3">Configure the payment methods this barber accepts</p>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-sm">
                    Z
                  </div>
                  <h4 className="text-purple-400 font-semibold">Zelle</h4>
                </div>
                
                <div>
                  <Label htmlFor="zelleEmail" className="text-gray-400 text-sm">Email de Zelle</Label>
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
                  <Label htmlFor="zellePhone" className="text-gray-400 text-sm">Zelle Phone</Label>
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
                  <p className="text-xs text-gray-600 mt-1">Include the $ sign at the beginning</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Profile image</Label>
              {previewImage ? (
                <div className="relative mt-2">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900">
                    <Image
                      src={previewImage}
                      alt="Preview"
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
                    Remove image
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
                      {uploadingImage ? 'Uploading...' : 'Drag an image or click to select'}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">Max. 10MB</p>
                  </label>
                </div>
              )}
              <div className="mt-2">
                <Label htmlFor="profileImage-url" className="text-gray-500 text-xs">Or enter a URL (optional)</Label>
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
              Cancel
            </Button>
            <Button
              onClick={handleAddBarber}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Barber'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Barber Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#00f0ff]">Edit Barber</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update {selectedBarber?.user?.name}&apos;s information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-gray-300">Name</Label>
              <Input
                id="edit-name"
                value={editBarberForm.name}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, name: e.target.value })}
                placeholder="Barber name"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-contactEmail" className="text-gray-300">Barber Personal Email</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={editBarberForm.contactEmail}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, contactEmail: e.target.value })}
                placeholder="E.g.: adolfoboome@gmail.com"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Personal email for contact and notifications</p>
            </div>

            {/* REMOVED: Gender selector - This page only manages MALE barbers */}
            <input type="hidden" name="edit-gender" value="MALE" />
            
            <div>
              <Label htmlFor="edit-specialties" className="text-gray-300">Specialties</Label>
              <Input
                id="edit-specialties"
                value={editBarberForm.specialties}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, specialties: e.target.value })}
                placeholder="Ex: Classic cuts, Beard, Design"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-hourlyRate" className="text-gray-300">Hourly Rate ($)</Label>
              <Input
                id="edit-hourlyRate"
                type="number"
                value={editBarberForm.hourlyRate}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, hourlyRate: e.target.value })}
                placeholder="25"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-bio" className="text-gray-300">Biography</Label>
              <Textarea
                id="edit-bio"
                value={editBarberForm.bio}
                onChange={(e) => setEditBarberForm({ ...editBarberForm, bio: e.target.value })}
                  placeholder="Describe the barber&apos;s experience and style..."
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>

            {/* Social Media Links */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-gray-300 font-semibold mb-2">Social Media (optional)</h3>
              
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
              <h3 className="text-gray-300 font-semibold mb-2">Payment Methods</h3>
              <p className="text-xs text-gray-500 mb-3">Configure the payment methods this barber accepts</p>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-sm">
                    Z
                  </div>
                  <h4 className="text-purple-400 font-semibold">Zelle</h4>
                </div>
                
                <div>
                  <Label htmlFor="edit-zelleEmail" className="text-gray-400 text-sm">Email de Zelle</Label>
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
                  <Label htmlFor="edit-zellePhone" className="text-gray-400 text-sm">Zelle Phone</Label>
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
                  <p className="text-xs text-gray-600 mt-1">Include the $ sign at the beginning</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Profile Image</Label>
              {editPreviewImage ? (
                <div className="relative mt-2">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900">
                    <Image
                      src={editPreviewImage}
                      alt="Preview"
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
                    Delete image
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
                      {uploadingImage ? 'Uploading...' : 'Drag an image or click to select'}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">Max. 10MB</p>
                  </label>
                </div>
              )}
              <div className="mt-2">
                <Label htmlFor="edit-profileImage-url" className="text-gray-500 text-xs">O ingresa una URL (opcional)</Label>
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
              <Label htmlFor="edit-isActive" className="text-gray-300">Active barber</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              className="border-gray-700 text-gray-300"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBarber}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Barber Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">⚠️ Delete barber permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-semibold">{selectedBarber?.user?.name}</span>? 
              <br/><br/>
              <span className="text-red-400 font-semibold">This action CANNOT be undone.</span>
              <br/><br/>
              The following will be permanently deleted:
              <ul className="list-disc list-inside mt-2 text-gray-300 space-y-1">
                <li>Barber profile</li>
                <li>Schedule and availability</li>
                <li>Photo/video gallery</li>
                <li>Payment history</li>
                <li><span className="text-red-400">All their appointments (will be automatically cancelled)</span></li>
                <li>Associated reviews</li>
                <li><span className="text-red-400 font-semibold">User account and login credentials</span></li>
              </ul>
              <br/>
              <span className="text-red-400 font-semibold">⚠️ WARNING:</span> This deletion is PERMANENT and IRREVERSIBLE. The barber will NOT be able to log in again. Clients with appointments will be notified of the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBarber}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Yes, Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
