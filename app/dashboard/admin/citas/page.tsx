'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Filter, TrendingUp, CheckCircle, ArrowLeft, Trash2, AlertTriangle, UserX, StickyNote, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type Appointment = {
  id: string;
  date: string;
  time: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  barberNotes?: string | null;
  rescheduledFrom?: string | null;
  rescheduledTo?: string | null;
  autoConfirmed?: boolean;
  client: {
    name: string;
    email: string;
    phone?: string;
  };
  barber: {
    user: {
      name: string;
    };
  };
  service: {
    name: string;
    price: number;
    duration: number;
  };
};

type Barber = {
  id: string;
  user: {
    name: string;
  };
};

export default function AdminCitasPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [barberNotes, setBarberNotes] = useState('');
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [session, status, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      const appointmentsRes = await fetch('/api/appointments');
      const appointmentsData = await appointmentsRes.json();
      setAppointments(appointmentsData.appointments || []);

      const barbersRes = await fetch('/api/barbers');
      const barbersData = await barbersRes.json();
      setBarbers(barbersData.barbers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/20 text-green-500';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-500';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'PENDING':
        return 'Pending';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'NO_SHOW':
        return 'No Show';
      default:
        return status;
    }
  };

  const handleDeleteClick = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/appointments/${appointmentToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error canceling appointment');
      }

      toast.success('Appointment cancelled successfully');
      
      // Reload appointments
      await loadData();
      
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error: unknown) {
      console.error('Error canceling appointment:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Error canceling appointment');
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkAsNoShow = async (appointmentId: string) => {
    if (!confirm('Mark this appointment as NO SHOW (client did not attend)?')) return;

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/no-show`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('✓ Appointment marked as NO SHOW');
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error marking as NO SHOW');
      }
    } catch (error) {
      console.error('Error marking as no-show:', error);
      toast.error('Error marking as NO SHOW');
    }
  };

  const handleOpenNotesDialog = (appointment: Appointment) => {
    setEditingNotes(appointment.id);
    setBarberNotes(appointment.barberNotes || '');
  };

  const handleUpdateBarberNotes = async () => {
    if (!editingNotes) return;

    try {
      const response = await fetch(`/api/appointments/${editingNotes}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberNotes }),
      });

      if (response.ok) {
        toast.success('✓ Notes updated');
        await loadData();
        setEditingNotes(null);
        setBarberNotes('');
      } else {
        toast.error('Error updating notes');
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Error updating notes');
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      setChangingStatus(appointmentId);
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`✓ Status changed to ${getStatusText(newStatus)}`);
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error changing status');
      }
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Error changing status');
    } finally {
      setChangingStatus(null);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedBarber !== 'all' && apt.barber.user.name !== selectedBarber) {
      return false;
    }
    if (selectedStatus !== 'all' && apt.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const stats = {
    total: filteredAppointments.length,
    confirmed: filteredAppointments.filter((a) => a.status === 'CONFIRMED').length,
    pending: filteredAppointments.filter((a) => a.status === 'PENDING').length,
    completed: filteredAppointments.filter((a) => a.status === 'COMPLETED').length,
    noShow: filteredAppointments.filter((a) => a.status === 'NO_SHOW').length,
    cancelled: filteredAppointments.filter((a) => a.status === 'CANCELLED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#00f0ff]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <Button
          onClick={() => router.push('/dashboard/admin')}
          variant="outline"
          size="icon"
          className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
          aria-label="Back to Panel"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            All <span className="text-[#00f0ff]">Appointments</span>
          </h1>
          <p className="text-gray-400 mt-1">Complete system appointment management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-[#00f0ff]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Confirmed</p>
                <p className="text-2xl font-bold text-green-500">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">No Show</p>
                <p className="text-2xl font-bold text-red-500">{stats.noShow}</p>
              </div>
              <UserX className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cancelled</p>
                <p className="text-2xl font-bold text-gray-500">{stats.cancelled}</p>
              </div>
              <Trash2 className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#00f0ff] flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
            {(selectedBarber !== 'all' || selectedStatus !== 'all') && (
              <span className="text-xs bg-[#00f0ff]/20 text-[#00f0ff] px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Active filters
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Barber</label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className={`bg-zinc-800 border-zinc-700 transition-colors ${selectedBarber !== 'all' ? 'border-[#00f0ff] ring-1 ring-[#00f0ff]/50' : ''}`}>
                  <SelectValue placeholder="Select barber" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All barbers</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.user.name}>
                      {barber.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className={`bg-zinc-800 border-zinc-700 transition-colors ${selectedStatus !== 'all' ? 'border-[#00f0ff] ring-1 ring-[#00f0ff]/50' : ''}`}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSelectedBarber('all');
                  setSelectedStatus('all');
                  toast.success('Filters cleared');
                }}
                variant="outline"
                className="w-full border-zinc-700 hover:bg-zinc-800 hover:border-[#00f0ff] transition-colors"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Appointments ({filteredAppointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No appointments match the filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 rounded-lg border border-zinc-800 bg-black hover:border-[#00f0ff] transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">
                          {appointment.client?.name || 'Client'}
                        </h3>
                        <span className="text-gray-500">→</span>
                        <span className="text-[#00f0ff]">
                          {appointment.barber?.user?.name || 'Barber'}
                        </span>
                        {appointment.rescheduledFrom && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Rescheduled
                          </span>
                        )}
                        {appointment.autoConfirmed && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                            Auto-confirmed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-1">
                        {appointment.service?.name || 'Service'} - $
                        {appointment.service?.price || 0}
                      </p>
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(appointment.date)} a las {appointment.time}
                      </div>
                      {appointment.notes && (
                        <p className="text-gray-500 text-sm mt-2 italic">
                          📝 Client note: {appointment.notes}
                        </p>
                      )}
                      {appointment.barberNotes && (
                        <p className="text-blue-400 text-sm mt-1 italic flex items-center gap-1">
                          <StickyNote className="w-3 h-3" />
                          Barber note: {appointment.barberNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {appointment.paymentMethod && (
                          <span className="text-sm text-gray-400 px-2 py-1 bg-zinc-800 rounded">
                            {appointment.paymentMethod}
                          </span>
                        )}
                        <Select
                          value={appointment.status}
                          onValueChange={(newStatus) => handleStatusChange(appointment.id, newStatus)}
                          disabled={changingStatus === appointment.id}
                        >
                          <SelectTrigger className={`w-36 h-8 text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            <SelectItem value="NO_SHOW">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Button to add/edit barber notes */}
                        <Button
                          onClick={() => handleOpenNotesDialog(appointment)}
                          size="sm"
                          variant="ghost"
                          className={`h-8 ${appointment.barberNotes ? 'text-green-500 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10'}`}
                        >
                          <StickyNote className="w-4 h-4" />
                        </Button>

                        {/* NO_SHOW button - only for CONFIRMED/PENDING */}
                        {(appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') && (
                          <Button
                            onClick={() => handleMarkAsNoShow(appointment.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Cancel button */}
                        {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && appointment.status !== 'NO_SHOW' && (
                          <Button
                            onClick={() => handleDeleteClick(appointment.id)}
                            size="sm"
                            variant="ghost"
                            className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Cancellation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to cancel this appointment? This action cannot be undone.
              The client will be notified about the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              disabled={deleting}
            >
              No, keep appointment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelling...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Yes, cancel appointment
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Barber Notes Dialog */}
      <Dialog open={!!editingNotes} onOpenChange={(open) => !open && setEditingNotes(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <StickyNote className="w-5 h-5 text-blue-400" />
              Barber Notes
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add notes about customer preferences, previous cuts, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={barberNotes}
              onChange={(e) => setBarberNotes(e.target.value)}
              placeholder="E.g.: Client prefers low fade, uses machine #2..."
              className="min-h-[120px] bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setEditingNotes(null);
                  setBarberNotes('');
                }}
                variant="outline"
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBarberNotes}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <StickyNote className="w-4 h-4 mr-2" />
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
