'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  User, 
  Trash2, 
  Search, 
  Mail, 
  Calendar, 
  Shield, 
  ArrowLeft, 
  Edit, 
  Eye, 
  Download, 
  Bell, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone?: string | null;
  createdAt: string;
  updatedAt?: string;
  // lastLoginAt field doesn't exist in schema yet
  image: string | null;
  barber?: {
    id: string;
    specialties?: string;
    bio?: string;
    services?: unknown[];
    _count?: {
      appointments?: number;
      reviews?: number;
    };
  } | null;
  _count?: {
    appointments?: number;
    appointmentsAsClient?: number;
    reviews?: number;
    posts?: number;
    notifications?: number;
  };
}

type AppointmentLite = {
  id: string;
  date: string | Date;
  time: string;
  status: string;
  service?: { name?: string | null } | null;
};

type ReviewLite = {
  id: string;
  rating: number;
  createdAt: string | Date;
  comment?: string | null;
};

interface UserDetails extends UserData {
  appointmentsAsClient?: AppointmentLite[];
  reviewsGiven?: ReviewLite[];
  posts?: unknown[];
}

export default function AdminUsuariosPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [includeBarbers, setIncludeBarbers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Filter states
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [hasAppointmentsFilter, setHasAppointmentsFilter] = useState<string>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CLIENT',
    password: '',
  });
  
  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CLIENT',
    password: '',
  });
  
  // Notify form
  const [notifyForm, setNotifyForm] = useState({
    subject: '',
    message: '',
    notificationType: 'both',
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    // Filter users based on search term and filters
    console.log('[AdminUsuarios FILTER] Starting filter...');
    console.log('[AdminUsuarios FILTER] Total users:', users.length);
    console.log('[AdminUsuarios FILTER] Filters:', { roleFilter, dateFilter, hasAppointmentsFilter, searchTerm });
    
    // Start with a fresh copy of users
    let filtered = [...users];
    
    // If no users, don't filter
    if (users.length === 0) {
      console.log('[AdminUsuarios FILTER] No users to filter');
      setFilteredUsers([]);
      return;
    }
    
    // Search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('[AdminUsuarios FILTER] After search:', filtered.length);
    }
    
    // Role filter
    if (roleFilter !== 'ALL') {
      const before = filtered.length;
      filtered = filtered.filter((user) => {
        console.log(`[AdminUsuarios FILTER] Checking user ${user.name} with role ${user.role} against filter ${roleFilter}:`, user.role === roleFilter);
        return user.role === roleFilter;
      });
      console.log(`[AdminUsuarios FILTER] After role filter: ${filtered.length} (was ${before})`);
    }
    
    // Date filter
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'TODAY':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'WEEK':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'MONTH':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter((user) => new Date(user.createdAt) >= filterDate);
      console.log('[AdminUsuarios FILTER] After date filter:', filtered.length);
    }
    
    // Appointments filter
    if (hasAppointmentsFilter === 'WITH') {
      filtered = filtered.filter((user) => (user._count?.appointments || 0) > 0);
      console.log('[AdminUsuarios FILTER] After WITH appointments filter:', filtered.length);
    } else if (hasAppointmentsFilter === 'WITHOUT') {
      filtered = filtered.filter((user) => (user._count?.appointments || 0) === 0);
      console.log('[AdminUsuarios FILTER] After WITHOUT appointments filter:', filtered.length);
    }
    
    console.log('[AdminUsuarios FILTER] Final filtered count:', filtered.length);
    console.log('[AdminUsuarios FILTER] Final filtered users:', filtered.map(u => u.name));
    console.log('[AdminUsuarios FILTER] About to setFilteredUsers with', filtered.length, 'users');
    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
    console.log('[AdminUsuarios FILTER] setFilteredUsers called');
  }, [searchTerm, users, roleFilter, dateFilter, hasAppointmentsFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      console.log('[AdminUsuarios] ===== FETCHING USERS =====');
      const response = await fetch('/api/admin/users');
      console.log('[AdminUsuarios] Response status:', response.status);
      console.log('[AdminUsuarios] Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AdminUsuarios] Raw data received:', data);
        console.log('[AdminUsuarios] Users received:', data.users?.length || 0);
        console.log('[AdminUsuarios] First user:', data.users?.[0]);
        console.log('[AdminUsuarios] All user roles:', (data.users as UserData[] | undefined)?.map((u) => `${u.name}: ${u.role}`));
        console.log('[AdminUsuarios] About to call setUsers with', data.users?.length, 'users');
        setUsers(data.users || []);
        console.log('[AdminUsuarios] setUsers called');
        // Don't set filteredUsers here - let the useEffect handle filtering
        console.log('[AdminUsuarios] Users state set');
      } else {
        const errorText = await response.text();
        console.error('[AdminUsuarios] Error response:', response.status, errorText);
        toast.error('Error loading users');
      }
    } catch (error) {
      console.error('[AdminUsuarios] Error fetching users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
      console.log('[AdminUsuarios] ===== FETCH COMPLETE =====');
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      fetchUsers();
    }
  }, [session, status, router, fetchUsers]);

  const openDeleteDialog = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error deleting user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCleanupTestUsers = async () => {
    setCleaningUp(true);
    try {
      const response = await fetch('/api/admin/users/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeBarbers: includeBarbers,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Cleanup completed! ${data.deletedCount} user(s) deleted${
            data.skippedCount > 0 ? `, ${data.skippedCount} skipped` : ''
          }`
        );
        setIsCleanupDialogOpen(false);
        setIncludeBarbers(false); // Reset checkbox
        fetchUsers(); // Refresh the list
      } else {
        toast.error(data.error || 'Cleanup error');
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
      toast.error('Error cleaning up test users');
    } finally {
      setCleaningUp(false);
    }
  };

  const openDetailsDialog = async (user: UserData) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
    setLoadingDetails(true);
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserDetails(data.user);
      } else {
        toast.error('Error loading user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Error loading user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast.success('User updated successfully');
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        // Reset filters to show all users after edit
        setSearchTerm('');
        setRoleFilter('ALL');
        setDateFilter('ALL');
        setHasAppointmentsFilter('ALL');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error updating user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      role: 'CLIENT',
      password: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error('Name, email and password are required');
      return;
    }

    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        toast.success('User created successfully');
        setIsCreateDialogOpen(false);
        // Reset filters to show all users
        setSearchTerm('');
        setRoleFilter('ALL');
        setDateFilter('ALL');
        setHasAppointmentsFilter('ALL');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error creating user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Error creating user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportUsers = async () => {
    try {
      toast.info('Generating CSV...');
      const response = await fetch('/api/admin/users/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Users exported successfully');
      } else {
        toast.error('Error exporting users');
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Error exporting users');
    }
  };

  const handleSendNotifications = async () => {
    if (!notifyForm.message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      const isSms = notifyForm.notificationType === 'sms';
      const response = await fetch(isSms ? '/api/admin/users/sms' : '/api/admin/users/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isSms
            ? {
                userIds: selectedUserIds,
                message: notifyForm.message,
              }
            : {
                userIds: selectedUserIds,
                subject: notifyForm.subject,
                message: notifyForm.message,
                notificationType: notifyForm.notificationType,
              }
        ),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Sent to ${data.stats.totalUsers} user(s)`);
        setIsNotifyDialogOpen(false);
        setNotifyForm({ subject: '', message: '', notificationType: 'both' });
        setSelectedUserIds([]);
        setSelectAll(false);
      } else {
        toast.error(data.error || 'Error sending notifications');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Error sending notifications');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(paginatedUsers.map((user) => user.id));
    }
    setSelectAll(!selectAll);
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, { bg: string; text: string; label: string }> = {
      ADMIN: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Administrator' },
      BARBER: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Barber' },
      CLIENT: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Client' },
    };

    const config = roleColors[role] || roleColors.CLIENT;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/admin')}
                className="text-gray-400 hover:text-cyan-400 hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  <span className="text-white">Users </span>
                  <span className="text-[#00f0ff]">Management</span>
                </h1>
                <p className="text-gray-400">Manage all system users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-6">
            {/* Action Buttons */}
            <div className="flex gap-2 items-center justify-end mb-4">
              <Button
                onClick={openCreateDialog}
                className="bg-gradient-to-r from-[#00f0ff] to-[#00d0df] hover:from-[#00d0df] hover:to-[#00b0bf] text-black font-semibold shadow-lg shadow-[#00f0ff]/50"
              >
                <User className="w-4 h-4 mr-2" />
                Add User
              </Button>
              
              <Button
                onClick={handleExportUsers}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              
              <Button
                onClick={() => setIsCleanupDialogOpen(true)}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-red-500/50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clean Tests
              </Button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            
            {/* Advanced Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Filters:</span>
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px] bg-[#0a0a0a] border-gray-700 text-white">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">All roles</SelectItem>
                  <SelectItem value="ADMIN">Administrators</SelectItem>
                  <SelectItem value="BARBER">Barbers</SelectItem>
                  <SelectItem value="CLIENT">Clients</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px] bg-[#0a0a0a] border-gray-700 text-white">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">All dates</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="WEEK">Last week</SelectItem>
                  <SelectItem value="MONTH">Last month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={hasAppointmentsFilter} onValueChange={setHasAppointmentsFilter}>
                <SelectTrigger className="w-[180px] bg-[#0a0a0a] border-gray-700 text-white">
                  <SelectValue placeholder="Appointment status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">With or without appointments</SelectItem>
                  <SelectItem value="WITH">With appointments</SelectItem>
                  <SelectItem value="WITHOUT">Without appointments</SelectItem>
                </SelectContent>
              </Select>
              
              {(roleFilter !== 'ALL' || dateFilter !== 'ALL' || hasAppointmentsFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoleFilter('ALL');
                    setDateFilter('ALL');
                    setHasAppointmentsFilter('ALL');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{users.length}</p>
                  {filteredUsers.length !== users.length && (
                    <p className="text-xs text-[#00f0ff] mt-1">
                      {filteredUsers.length} filtered
                    </p>
                  )}
                </div>
                <User className="w-10 h-10 text-[#00f0ff]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Administrators</p>
                  <p className="text-3xl font-bold text-white">
                    {users.filter((u) => u.role === 'ADMIN').length}
                  </p>
                </div>
                <Shield className="w-10 h-10 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Barbers</p>
                  <p className="text-3xl font-bold text-white">
                    {users.filter((u) => u.role === 'BARBER' || u.role === 'STYLIST').length}
                  </p>
                </div>
                <User className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Clients</p>
                  <p className="text-3xl font-bold text-white">
                    {users.filter((u) => u.role === 'CLIENT').length}
                  </p>
                </div>
                <User className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">
                {searchTerm ? 'No users found' : 'No users registered'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All Checkbox */}
            {paginatedUsers.length > 0 && (
              <div className="mb-4 flex items-center gap-3 px-4">
                <Checkbox
                  id="selectAll"
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                  className="border-gray-600"
                />
                <label htmlFor="selectAll" className="text-sm text-gray-400 cursor-pointer">
                  Select all on this page ({paginatedUsers.length})
                </label>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              {paginatedUsers.map((user) => {
                console.log('[RENDER] Rendering user:', user.name, 'with role:', user.role);
                return (
              <Card key={user.id} className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        className="border-gray-600"
                      />
                    </div>
                    
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#ffd700] flex items-center justify-center flex-shrink-0 relative">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || 'User'}
                          fill
                          sizes="64px"
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-white">
                          {user.name || 'No name'}
                        </h3>
                        {getRoleBadge(user.role)}
                        {user.barber && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                            ✂️ Barber
                          </span>
                        )}
                        {/* New User Badge */}
                        {new Date(user.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#00f0ff]/20 text-[#00f0ff]">
                            ✨ New
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Registered: {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: enUS })}
                          </span>
                        </div>

                        {user._count && (
                          <div className="flex items-center gap-4">
                            {(user._count.appointments || 0) > 0 && (
                              <div className="text-gray-400">
                                <span className="font-semibold text-[#00f0ff]">
                                  {user._count.appointments || 0}
                                </span>{' '}
                                appointment{(user._count.appointments || 0) !== 1 ? 's' : ''}
                              </div>
                            )}
                            {(user._count.reviews || 0) > 0 && (
                              <div className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-4 h-4" />
                                <span>{user._count.reviews}</span>
                              </div>
                            )}
                            {(user._count.posts || 0) > 0 && (
                              <div className="flex items-center gap-1 text-purple-400">
                                <MessageSquare className="w-4 h-4" />
                                <span>{user._count.posts}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => openDetailsDialog(user)}
                        variant="outline"
                        size="sm"
                        className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {/* Owner can edit anyone, other admins can only edit themselves, non-admins can be edited */}
                      {(user.role !== 'ADMIN' || 
                        session?.user?.email === 'admin@barberia.com' || 
                        user.id === session?.user?.id) && (
                        <Button
                          onClick={() => openEditDialog(user)}
                          variant="outline"
                          size="sm"
                          className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Owner can delete anyone except themselves, others can only delete non-admins */}
                      {(user.role !== 'ADMIN' || 
                        (session?.user?.email === 'admin@barberia.com' && user.id !== session?.user?.id)) && (
                        <Button
                          onClick={() => openDeleteDialog(user)}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-400">
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} of{' '}
                  {filteredUsers.length} users
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="border-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        onClick={() => goToPage(page)}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className={
                          currentPage === page
                            ? 'bg-[#00f0ff] text-black hover:bg-[#00d0df]'
                            : 'border-gray-700 hover:border-[#00f0ff]'
                        }
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="border-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">⚠️ Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete{' '}
              <span className="text-white font-semibold">
                {selectedUser?.name || selectedUser?.email}
              </span>
              ?
              <br />
              <br />
              <span className="text-red-400 font-semibold">This action CANNOT be undone.</span>
              <br />
              <br />
              The following will be permanently deleted:
              <ul className="list-disc list-inside mt-2 text-gray-300 space-y-1">
                <li>User profile</li>
                <li>Appointment history</li>
                <li>Reviews created</li>
                <li>Messages and notifications</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Yes, Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">
              User Details
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f0ff]"></div>
            </div>
          ) : userDetails ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-4 p-4 bg-gray-900 rounded-lg">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#ffd700] flex items-center justify-center">
                  {userDetails.image ? (
                    <Image
                      src={userDetails.image}
                      alt={userDetails.name || 'User'}
                      width={80}
                      height={80}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{userDetails.name || 'No name'}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400">Email:</span> <span className="text-white">{userDetails.email}</span></div>
                    <div><span className="text-gray-400">Role:</span> <span className="text-white">{userDetails.role}</span></div>
                    <div><span className="text-gray-400">Registered:</span> <span className="text-white">{format(new Date(userDetails.createdAt), 'dd MMM yyyy', { locale: enUS })}</span></div>
                    <div><span className="text-gray-400">Updated:</span> <span className="text-white">{format(new Date(userDetails.updatedAt || userDetails.createdAt), 'dd MMM yyyy', { locale: enUS })}</span></div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg text-center">
                  <Calendar className="w-6 h-6 text-[#00f0ff] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userDetails._count?.appointmentsAsClient || 0}</div>
                  <div className="text-xs text-gray-400">Appointments</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg text-center">
                  <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userDetails._count?.reviews || 0}</div>
                  <div className="text-xs text-gray-400">Reviews</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg text-center">
                  <MessageSquare className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userDetails._count?.posts || 0}</div>
                  <div className="text-xs text-gray-400">Posts</div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg text-center">
                  <Bell className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userDetails._count?.notifications || 0}</div>
                  <div className="text-xs text-gray-400">Notifications</div>
                </div>
              </div>

              {/* Barber Info */}
              {userDetails.barber && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-[#00f0ff] mb-3">Barber Information</h4>
                  <div className="space-y-2 text-sm">
                    {userDetails.barber.specialties && (
                      <div><span className="text-gray-400">Specialties:</span> <span className="text-white">{userDetails.barber.specialties}</span></div>
                    )}
                    {userDetails.barber.bio && (
                      <div><span className="text-gray-400">Bio:</span> <span className="text-white">{userDetails.barber.bio}</span></div>
                    )}
                    <div><span className="text-gray-400">Services offered:</span> <span className="text-white">{userDetails.barber.services?.length || 0}</span></div>
                    <div><span className="text-gray-400">Completed appointments:</span> <span className="text-white">{userDetails.barber._count?.appointments || 0}</span></div>
                    <div><span className="text-gray-400">Reviews received:</span> <span className="text-white">{userDetails.barber._count?.reviews || 0}</span></div>
                  </div>
                </div>
              )}

              {/* Recent Appointments */}
              {userDetails.appointmentsAsClient && userDetails.appointmentsAsClient.length > 0 && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-[#00f0ff] mb-3">Recent Appointments</h4>
                  <div className="space-y-2">
                    {userDetails.appointmentsAsClient.slice(0, 5).map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                        <div>
                          <p className="text-white text-sm">{apt.service?.name || 'Service'}</p>
                          <p className="text-gray-400 text-xs">
                            {format(new Date(apt.date), 'dd MMM yyyy', { locale: enUS })} - {apt.time}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${apt.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : apt.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Reviews */}
              {userDetails.reviewsGiven && userDetails.reviewsGiven.length > 0 && (
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-[#00f0ff] mb-3">Reviews Left</h4>
                  <div className="space-y-3">
                    {userDetails.reviewsGiven.slice(0, 5).map((review) => (
                      <div key={review.id} className="border-b border-gray-800 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">
                            {format(new Date(review.createdAt), 'dd MMM yyyy', { locale: enUS })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{review.comment || 'No comment'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">Could not load details</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify user information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-gray-300">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="Full name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-email" className="text-gray-300">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="edit-phone" className="text-gray-300">Phone (optional)</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="+17813677244"
              />
              <p className="text-xs text-gray-500 mt-1">Use international format (E.164)</p>
            </div>
            
            <div>
              <Label htmlFor="edit-role" className="text-gray-300">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="BARBER">Barber</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-password" className="text-gray-300">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="Leave empty to not change"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={submitting}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={submitting}
              className="bg-[#00f0ff] text-black hover:bg-[#00d0df]"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">
              Create New User
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name" className="text-gray-300">Name *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="Full name"
              />
            </div>
            
            <div>
              <Label htmlFor="create-email" className="text-gray-300">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="create-phone" className="text-gray-300">Phone (optional)</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="+17813677244"
              />
              <p className="text-xs text-gray-500 mt-1">Use international format (E.164)</p>
            </div>
            
            <div>
              <Label htmlFor="create-role" className="text-gray-300">Role</Label>
              <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="BARBER">Barber</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="create-password" className="text-gray-300">Password *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="Minimum 6 characters"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={submitting}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={submitting}
              className="bg-[#00f0ff] text-black hover:bg-[#00d0df]"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Users Dialog */}
      <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">
              Send Bulk Notification
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Send a message to {selectedUserIds.length} selected user(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notify-type" className="text-gray-300">Notification Type</Label>
              <Select value={notifyForm.notificationType} onValueChange={(value) => setNotifyForm({ ...notifyForm, notificationType: value })}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="both">Email + In-app Notification</SelectItem>
                  <SelectItem value="email">Email only</SelectItem>
                  <SelectItem value="notification">In-app notification only</SelectItem>
                  <SelectItem value="sms">SMS only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notify-subject" className="text-gray-300">Subject</Label>
              <Input
                id="notify-subject"
                value={notifyForm.subject}
                onChange={(e) => setNotifyForm({ ...notifyForm, subject: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="Message subject"
              />
            </div>
            
            <div>
              <Label htmlFor="notify-message" className="text-gray-300">Message</Label>
              <Textarea
                id="notify-message"
                value={notifyForm.message}
                onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1 min-h-[150px]"
                placeholder="Type your message here..."
              />
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                ℹ️ This message will be sent to {selectedUserIds.length} selected user(s).
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNotifyDialogOpen(false)}
              disabled={submitting}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNotifications}
              disabled={submitting}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {submitting ? 'Sending...' : 'Send Notification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Test Users Dialog */}
      <AlertDialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 text-2xl">
              🧹 Clean up ALL Test Users?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 space-y-4">
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 my-4">
                <p className="text-red-400 font-bold text-lg mb-2">⚠️ WARNING: This action is IRREVERSIBLE</p>
                <p className="text-red-300">
                  This operation will PERMANENTLY delete all users that contain &quot;test&quot; in their name or email.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-white font-semibold">The system will automatically delete:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-300 pl-4">
                  <li>✅ <strong>All test users</strong> (Test User, test@example.com, etc.)</li>
                  <li>✅ <strong>Will cancel their appointments</strong> pending or confirmed automatically</li>
                  <li>✅ <strong>Complete history</strong>: reviews, messages, notifications</li>
                  <li>✅ <strong>Related data</strong>: posts, comments, invoices</li>
                </ul>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                <p className="text-yellow-400 font-semibold mb-2">📋 What will NOT be deleted:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-300">
                  <li>Administrator users (always protected)</li>
                  {!includeBarbers && (
                    <li>Users who are barbers (you must check the option below to include them)</li>
                  )}
                </ul>
              </div>

              {/* Checkbox to include barbers */}
              <div className="bg-orange-500/10 border-2 border-orange-500/70 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="includeBarbers"
                    checked={includeBarbers}
                    onCheckedChange={(checked) => setIncludeBarbers(checked as boolean)}
                    className="mt-1 border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <label
                    htmlFor="includeBarbers"
                    className="cursor-pointer flex-1"
                  >
                    <p className="text-orange-400 font-bold text-lg mb-2">
                      ✂️ Also delete test BARBERS/STYLISTS
                    </p>
                    <p className="text-orange-300 text-sm mb-2">
                      <strong>IMPORTANT:</strong> If you check this option, it will also delete:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-orange-200 text-sm ml-4">
                      <li>All test barbers/stylists</li>
                      <li>Their photo/video galleries</li>
                      <li>Their schedules and availability</li>
                      <li>Their configured days off</li>
                      <li>All appointments where they worked</li>
                      <li>Reviews they have received</li>
                      <li>Their payments and commissions</li>
                    </ul>
                    <p className="text-orange-300 font-semibold mt-2 text-sm">
                      💡 Use this if your barbers have issues with photo uploads and need to start from scratch.
                    </p>
                  </label>
                </div>
              </div>

              <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/50 rounded-lg p-4">
                <p className="text-[#00f0ff] font-semibold mb-2">💡 After cleanup:</p>
                <p className="text-gray-300">
                  You can create new users {includeBarbers && 'and barbers '}and configure everything correctly from scratch.
                </p>
              </div>

              <p className="text-center text-xl font-bold text-red-400 mt-4">
                Are you COMPLETELY sure{includeBarbers ? ' to delete EVERYTHING (including barbers)' : ''}?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-gray-700 text-gray-300 hover:bg-gray-800" 
              disabled={cleaningUp}
            >
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanupTestUsers}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold"
              disabled={cleaningUp}
            >
              {cleaningUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Cleaning...
                </>
              ) : (
                'Yes, Delete ALL Test Users'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
