'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Promotion {
  id: string;
  title: string;
  message: string;
  discount: string | null;
  startDate: string;
  endDate: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  targetRole: string | null;
  sentCount: number;
  viewCount: number;
  createdAt: string;
}

export default function PromotionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    message: '',
    discount: '',
    startDate: '',
    endDate: '',
    targetRole: 'ALL',
    sendNow: false,
    notificationType: 'both',
  });

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      
      console.log('[PROMOTIONS] Fetching with filter:', statusFilter);
      const response = await fetch(`/api/admin/promotions?${params.toString()}`);
      const data = await response.json();
      
      console.log('[PROMOTIONS] Response:', data);
      console.log('[PROMOTIONS] Promotions count:', data.promotions?.length || 0);
      
      if (response.ok) {
        setPromotions(data.promotions || []);
        console.log('[PROMOTIONS] State updated with', data.promotions?.length || 0, 'promotions');
      } else {
        console.error('[PROMOTIONS] Error response:', data);
        toast.error('Error loading promotions');
      }
    } catch (error) {
      console.error('[PROMOTIONS] Error fetching promotions:', error);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
      fetchPromotions();
    }
  }, [fetchPromotions, router, session, status]);

  const handleCreatePromotion = async () => {
    if (!form.title.trim() || !form.message.trim() || !form.startDate || !form.endDate) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          targetRole: form.targetRole === 'ALL' ? null : form.targetRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Promotion created successfully');
        setIsCreateDialogOpen(false);
        setForm({
          title: '',
          message: '',
          discount: '',
          startDate: '',
          endDate: '',
          targetRole: 'ALL',
          sendNow: false,
          notificationType: 'both',
        });
        fetchPromotions();
      } else {
        toast.error(data.error || 'Error creating promotion');
      }
    } catch (error) {
      console.error('Error creating promotion:', error);
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPromotion = async (id: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/promotions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (response.ok) {
        toast.success('Promotion cancelled');
        fetchPromotions();
      } else {
        toast.error('Error cancelling promotion');
      }
    } catch (error) {
      console.error('Error canceling promotion:', error);
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromotion = async () => {
    if (!selectedPromotion) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/promotions/${selectedPromotion.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Promotion deleted');
        setIsDeleteDialogOpen(false);
        setSelectedPromotion(null);
        fetchPromotions();
      } else {
        toast.error('Error deleting promotion');
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/50',
      EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/50',
    };

    const labels = {
      SCHEDULED: '📅 Scheduled',
      ACTIVE: '✅ Active',
      EXPIRED: '⏰ Expired',
      CANCELLED: '❌ Cancelled',
    };

    const icons = {
      SCHEDULED: <Clock className="w-3 h-3" />,
      ACTIVE: <CheckCircle2 className="w-3 h-3" />,
      EXPIRED: <XCircle className="w-3 h-3" />,
      CANCELLED: <Ban className="w-3 h-3" />,
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00f0ff] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      
      <div className="max-w-7xl mx-auto p-6 mt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/admin')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#00a8cc] bg-clip-text text-transparent">
                Promotions Management
              </h1>
              <p className="text-gray-400 mt-1">
                Create and manage scheduled promotions
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-[#00f0ff] to-[#00a8cc] hover:opacity-90 text-black font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Promotion
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-400 text-sm font-semibold mb-1">Scheduled</p>
                  <p className="text-3xl font-bold text-blue-300">
                    {promotions.filter(p => p.status === 'SCHEDULED').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm font-semibold mb-1">Active</p>
                  <p className="text-3xl font-bold text-green-300">
                    {promotions.filter(p => p.status === 'ACTIVE').length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-semibold mb-1">Expired</p>
                  <p className="text-3xl font-bold text-gray-300">
                    {promotions.filter(p => p.status === 'EXPIRED').length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-400 text-sm font-semibold mb-1">Cancelled</p>
                  <p className="text-3xl font-bold text-red-300">
                    {promotions.filter(p => p.status === 'CANCELLED').length}
                  </p>
                </div>
                <Ban className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="text-gray-400 whitespace-nowrap">Filter by status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Promotions List */}
        <div className="grid grid-cols-1 gap-4">
          {promotions.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No promotions</p>
                <p className="text-gray-600 text-sm mt-2">
                  Create your first promotion to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            promotions.map((promo) => (
              <Card key={promo.id} className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff]/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-white">{promo.title}</h3>
                        {getStatusBadge(promo.status)}
                        {promo.discount && (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold border border-yellow-500/50">
                            💰 {promo.discount}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-300 mb-4">{promo.message}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Start</p>
                          <p className="text-gray-300 font-semibold">
                            {format(new Date(promo.startDate), 'dd MMM yyyy', { locale: es })}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {format(new Date(promo.startDate), 'HH:mm', { locale: es })}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 mb-1">End</p>
                          <p className="text-gray-300 font-semibold">
                            {format(new Date(promo.endDate), 'dd MMM yyyy', { locale: es })}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {format(new Date(promo.endDate), 'HH:mm', { locale: es })}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 mb-1">Target</p>
                          <p className="text-gray-300 font-semibold">
                            {promo.targetRole || 'All'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 mb-1">Sent</p>
                          <p className="text-gray-300 font-semibold">
                            {promo.sentCount} users
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {promo.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelPromotion(promo.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          disabled={submitting}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPromotion(promo);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        disabled={submitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Promotion Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">
              New Promotion
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a promotion with start and end dates
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="title" className="text-gray-300">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="🎉 Special Weekend Offer"
              />
            </div>
            
            <div>
              <Label htmlFor="discount" className="text-gray-300">Discount (optional)</Label>
              <Input
                id="discount"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1"
                placeholder="20%, $10, 2x1"
              />
            </div>
            
            <div>
              <Label htmlFor="message" className="text-gray-300">Message *</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white mt-1 min-h-[100px]"
                placeholder="Describe the promotion..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-gray-300">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="endDate" className="text-gray-300">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="targetRole" className="text-gray-300">Send to</Label>
              <Select value={form.targetRole} onValueChange={(value) => setForm({ ...form, targetRole: value })}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">All users</SelectItem>
                  <SelectItem value="CLIENT">Clients only</SelectItem>
                  <SelectItem value="BARBER">Barbers only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notificationType" className="text-gray-300">Notification type</Label>
              <Select value={form.notificationType} onValueChange={(value) => setForm({ ...form, notificationType: value })}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="both">Email + Notification</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="notification">Notification Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sendNow"
                  checked={form.sendNow}
                  onCheckedChange={(checked) => setForm({ ...form, sendNow: checked as boolean })}
                  className="mt-1"
                />
                <label htmlFor="sendNow" className="cursor-pointer flex-1">
                  <p className="text-[#00f0ff] font-semibold mb-1">
                    📧 Send notifications immediately
                  </p>
                  <p className="text-gray-400 text-sm">
                    If the promotion is active, it will be sent to users automatically when created
                  </p>
                </label>
              </div>
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
              onClick={handleCreatePromotion}
              disabled={submitting}
              className="bg-gradient-to-r from-[#00f0ff] to-[#00a8cc] hover:opacity-90 text-black font-semibold"
            >
              {submitting ? 'Creating...' : 'Create Promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">
              Delete promotion?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. The promotion will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePromotion}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
