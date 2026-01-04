'use client';

import { useEffect, useState } from 'react';
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
import { Scissors, Plus, Edit2, Trash2, Clock, DollarSign, Upload, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  image: string | null;
  barberId: string | null;
  gender: string | null;
  isActive: boolean;
}

export default function BarberServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for adding new service
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    image: '',
    gender: 'UNISEX',
  });
  const [_uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form state for editing service
  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    image: '',
    gender: 'UNISEX',
    isActive: true,
  });
  const [editPreviewImage, setEditPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    
    if (status === 'authenticated' && session?.user?.role !== 'BARBER' && session?.user?.role !== 'STYLIST') {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchServices();
    }
  }, [status, session, router]);

  const fetchServices = async () => {
    try {
      // Get the logged-in barber's barberId
      const barberResponse = await fetch('/api/barber/profile');
      if (!barberResponse.ok) {
        throw new Error('Could not fetch barber profile');
      }
      const barberData = await barberResponse.json();
      
      // Fetch ALL services and filter by barberId
      const response = await fetch('/api/services?adminView=true');
      if (response.ok) {
        const data = await response.json();
        // Filter only this barber's services
        const myServices = data.services.filter((s: Service) => s.barberId === barberData.barber.id);
        setServices(myServices || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Error loading services');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, isEdit: boolean = false) => {
    try {
      if (isEdit) {
        setUploadingImage(true);
      } else {
        setUploadingImage(true);
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/services/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (isEdit) {
          setEditServiceForm({ ...editServiceForm, image: data.url });
          setEditPreviewImage(data.url);
        } else {
          setNewServiceForm({ ...newServiceForm, image: data.url });
          setPreviewImage(data.url);
        }
        toast.success('Image uploaded successfully');
      } else {
        throw new Error('Error uploading image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddService = async () => {
    if (!newServiceForm.name || !newServiceForm.duration || !newServiceForm.price) {
      toast.error('Please complete the required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Get the logged-in barber's barberId
      const barberResponse = await fetch('/api/barber/profile');
      if (!barberResponse.ok) {
        throw new Error('Could not fetch barber profile');
      }
      const barberData = await barberResponse.json();
      
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceForm.name,
          description: newServiceForm.description || null,
          duration: parseInt(newServiceForm.duration),
          price: parseFloat(newServiceForm.price),
          image: newServiceForm.image || null,
          barberId: barberData.barber.id, // Asignar al barbero actual
          gender: newServiceForm.gender || 'UNISEX',
        }),
      });

      if (response.ok) {
        toast.success('Service added successfully');
        setIsAddDialogOpen(false);
        setNewServiceForm({
          name: '',
          description: '',
          duration: '',
          price: '',
          image: '',
          gender: 'UNISEX',
        });
        setPreviewImage(null);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error adding service');
      }
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Error adding service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = async () => {
    if (!selectedService) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editServiceForm.name,
          description: editServiceForm.description || null,
          duration: parseInt(editServiceForm.duration),
          price: parseFloat(editServiceForm.price),
          image: editServiceForm.image || null,
          barberId: selectedService.barberId, // Mantener el mismo barberId
          gender: editServiceForm.gender || 'UNISEX',
          isActive: editServiceForm.isActive,
        }),
      });

      if (response.ok) {
        toast.success('Service updated successfully');
        setIsEditDialogOpen(false);
        setSelectedService(null);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error updating service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Error updating service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Service deactivated successfully');
        setIsDeleteDialogOpen(false);
        setSelectedService(null);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error deactivating service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Error deactivating service');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setEditServiceForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: service.price.toString(),
      image: service.image || '',
      gender: service.gender || 'UNISEX',
      isActive: service.isActive,
    });
    setEditPreviewImage(service.image || null);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service);
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
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/barbero">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Services</h1>
              <p className="text-gray-400">Manage the services you offer to your clients</p>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>

        {services.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="py-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">You don&apos;t have any services yet</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first service
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff] transition-all duration-300"
              >
                <CardContent className="p-6">
                  {/* Service Image */}
                  <div className="relative w-full aspect-video mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={service.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Scissors className="w-16 h-16 text-[#00f0ff]/30" />
                      </div>
                    )}
                  </div>

                  {/* Service Info */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-white flex-1">{service.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ml-2 flex-shrink-0 ${
                        service.gender === 'MALE'
                          ? 'bg-blue-500/20 text-blue-400'
                          : service.gender === 'FEMALE'
                          ? 'bg-pink-500/20 text-pink-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {service.gender === 'MALE' ? '👨 Men' : service.gender === 'FEMALE' ? '👩 Women' : '👥 Unisex'}
                    </span>
                  </div>

                  {service.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  {/* Service Details */}
                  <div className="space-y-2 pt-4 border-t border-gray-800 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Duration
                      </span>
                      <span className="text-white font-semibold">{service.duration} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Price
                      </span>
                      <span className="text-[#ffd700] font-semibold text-lg">
                        ${service.price}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          service.isActive
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditDialog(service)}
                      variant="outline"
                      className="flex-1 border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => openDeleteDialog(service)}
                      variant="outline"
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deactivate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Service Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">Add New Service</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the details for the new service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Service name *</Label>
              <Input
                id="name"
                value={newServiceForm.name}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                placeholder="E.g.: Classic haircut"
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration" className="text-gray-300">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newServiceForm.duration}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, duration: e.target.value })}
                  placeholder="30"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="price" className="text-gray-300">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newServiceForm.price}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, price: e.target.value })}
                  placeholder="25.00"
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={newServiceForm.description}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                placeholder="Describe the service..."
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="gender" className="text-gray-300">Gender *</Label>
              <select
                id="gender"
                value={newServiceForm.gender}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, gender: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              >
                <option value="MALE">👨 Men</option>
                <option value="FEMALE">👩 Women</option>
                <option value="UNISEX">👥 Unisex</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Service image</Label>
              <div className="mt-2">
                {previewImage ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-2">
                    <Image src={previewImage} alt="Preview" fill className="object-cover" />
                    <button
                      onClick={() => {
                        setPreviewImage(null);
                        setNewServiceForm({ ...newServiceForm, image: '' });
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00f0ff] transition-colors cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Click to upload an image</p>
                    <p className="text-gray-600 text-xs mt-1">PNG, JPG (max. 10MB)</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, false);
                  }}
                  className="hidden"
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
              onClick={handleAddService}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00f0ff]">Edit Service</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the service information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-gray-300">Service name *</Label>
              <Input
                id="edit-name"
                value={editServiceForm.name}
                onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                className="bg-[#0a0a0a] border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-duration" className="text-gray-300">Duration (minutes) *</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={editServiceForm.duration}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, duration: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-price" className="text-gray-300">Price ($) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editServiceForm.price}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, price: e.target.value })}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description" className="text-gray-300">Description</Label>
              <Textarea
                id="edit-description"
                value={editServiceForm.description}
                onChange={(e) => setEditServiceForm({ ...editServiceForm, description: e.target.value })}
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-gender" className="text-gray-300">Gender *</Label>
              <select
                id="edit-gender"
                value={editServiceForm.gender}
                onChange={(e) => setEditServiceForm({ ...editServiceForm, gender: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              >
                <option value="MALE">👨 Men</option>
                <option value="FEMALE">👩 Women</option>
                <option value="UNISEX">👥 Unisex</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Service image</Label>
              <div className="mt-2">
                {editPreviewImage ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-2">
                    <Image src={editPreviewImage} alt="Preview" fill className="object-cover" />
                    <button
                      onClick={() => {
                        setEditPreviewImage(null);
                        setEditServiceForm({ ...editServiceForm, image: '' });
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00f0ff] transition-colors cursor-pointer"
                    onClick={() => document.getElementById('edit-image-upload')?.click()}
                  >
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Click to upload an image</p>
                  </div>
                )}
                <input
                  id="edit-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, true);
                  }}
                  className="hidden"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editServiceForm.isActive}
                onChange={(e) => setEditServiceForm({ ...editServiceForm, isActive: e.target.checked })}
                className="w-4 h-4 text-[#00f0ff] bg-[#0a0a0a] border-gray-700 rounded focus:ring-[#00f0ff]"
              />
              <Label htmlFor="edit-isActive" className="text-gray-300">Active service</Label>
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
              onClick={handleEditService}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#00f0ff]">
              Deactivate service?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will deactivate the service &quot;{selectedService?.name}&quot;. Clients won&apos;t be able to book it,
              but you can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              disabled={submitting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {submitting ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
