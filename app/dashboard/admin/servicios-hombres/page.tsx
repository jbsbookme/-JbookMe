'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { Scissors, Plus, Edit2, Trash2, Clock, DollarSign, Image as ImageIcon, Upload, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

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
  barber?: {
    user?: {
      name: string | null;
    };
  };
  _count?: {
    appointments: number;
  };
}

interface Barber {
  id: string;
  user?: {
    name: string | null;
  };
}

export default function AdminServiciosHombresPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [_genderFilter, _setGenderFilter] = useState<string>('MALE'); // FIXED: Only show men's services

  // Form state for adding new service
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    image: '',
    barberId: '',
    gender: 'MALE', // FIXED: Always default to MALE
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form state for editing service
  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    image: '',
    barberId: '',
    gender: 'MALE', // FIXED: Por defecto siempre MALE
    isActive: true,
  });
  const [editPreviewImage, setEditPreviewImage] = useState<string | null>(null);

  // Funci\u00f3n para subir imagen
  const handleImageUpload = async (file: File, isEdit: boolean = false) => {
    try {
      setUploadingImage(true);
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Only images are allowed');
        return;
      }

      // Validar tama\u00f1o (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('The image must not exceed 10MB');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/services/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setEditServiceForm({ ...editServiceForm, image: data.url });
          setEditPreviewImage(data.url);
        } else {
          setNewServiceForm({ ...newServiceForm, image: data.url });
          setPreviewImage(data.url);
        }
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Error uploading image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Manejar drop de archivo
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isEdit: boolean = false) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file, isEdit);
    }
  };

  // Manejar selecci\u00f3n de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, isEdit);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      fetchServices();
      fetchBarbers();
    }
  }, [status, session, router]);

  const fetchServices = async () => {
    try {
      // FIXED: Solo cargar servicios de HOMBRES
      const response = await fetch('/api/services?gender=MALE');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Error loading services');
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    try {
      // FIXED: Solo cargar barberos HOMBRES
      const response = await fetch('/api/barbers?gender=MALE');
      if (response.ok) {
        const data = await response.json();
        setBarbers(data.barbers || []);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
    }
  };

  const handleAddService = async () => {
    if (!newServiceForm.name || !newServiceForm.duration || !newServiceForm.price) {
      toast.error('Please complete the required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceForm.name,
          description: newServiceForm.description || null,
          duration: parseInt(newServiceForm.duration),
          price: parseFloat(newServiceForm.price),
          image: newServiceForm.image || null,
          barberId: newServiceForm.barberId || null,
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
          barberId: '',
          gender: 'UNISEX',
        });
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
          barberId: editServiceForm.barberId || null,
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
      barberId: service.barberId || '',
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

  // Filter services by gender
  // FIXED: Solo mostramos servicios de MALE, no necesitamos filtrar más
  const filteredServices = services;

  // Count services by gender (simplificado - solo MALE)
  const _serviceCounts = {
    all: services.length,
    male: services.length, // Todos son MALE
    female: 0,
    unisex: 0,
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Botón volver */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/admin')}
          className="text-gray-400 hover:text-[#00f0ff] active:text-[#00f0ff] mb-4"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Services for <span className="text-[#00f0ff]">Men</span>
            </h1>
            <p className="text-gray-400">Manage services for barbers (men)</p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* REMOVED: Gender Filter - Esta página solo muestra servicios de HOMBRES */}

        {services.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="py-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No services registered</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add first service
              </Button>
            </CardContent>
          </Card>
        ) : filteredServices.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="py-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No services in this category</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
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
                      <span className="text-[#ffd700] font-semibold text-lg shrink-0 whitespace-nowrap break-normal tabular-nums">
                        {formatPrice(service.price)}
                      </span>
                    </div>
                    {service.barber?.user?.name && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Barber</span>
                        <span className="text-[#00f0ff] text-sm">
                          {service.barber.user.name}
                        </span>
                      </div>
                    )}
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

      {/* Add Service Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#00f0ff]">Add New Service</DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete the new service information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Name *</Label>
              <Input
                id="name"
                value={newServiceForm.name}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                placeholder="E.g.: Classic Cut"
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
            
            {/* REMOVED: Gender selector - Esta página solo gestiona servicios de HOMBRES */}
            <input type="hidden" name="gender" value="MALE" />
            
            <div>
              <Label className="text-gray-300 flex items-center mb-3">
                <ImageIcon className="w-4 h-4 mr-2" />
                Service image
              </Label>
              
              {/* Preview de imagen */}
              {(previewImage || newServiceForm.image) && (
                <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden">
                  <Image
                    src={previewImage || newServiceForm.image}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewServiceForm({ ...newServiceForm, image: '' });
                      setPreviewImage(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload area */}
              {!previewImage && !newServiceForm.image && (
                <div
                  onDrop={(e) => handleDrop(e, false)}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00f0ff] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, false)}
                    className="hidden"
                    id="new-service-image"
                  />
                  <label htmlFor="new-service-image" className="cursor-pointer">
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${uploadingImage ? 'text-[#00f0ff] animate-pulse' : 'text-gray-600'}`} />
                    <p className="text-gray-400 mb-2">
                      {uploadingImage ? 'Uploading...' : 'Drag an image or click to select'}
                    </p>
                    <p className="text-gray-600 text-sm">PNG, JPG (max 10MB)</p>
                  </label>
                </div>
              )}

              {/* Input manual de URL (opcional) */}
              {!previewImage && !newServiceForm.image && (
                <div className="mt-3">
                  <p className="text-gray-500 text-sm mb-2">Or enter a URL:</p>
                  <Input
                    value={newServiceForm.image}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, image: e.target.value })}
                    placeholder="https://blog.lipsumhub.com/wp-content/uploads/2024/11/what-is-a-url-placeholder-lipsumhub.jpg"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="barber" className="text-gray-300">Specific barber (optional)</Label>
              <select
                id="barber"
                value={newServiceForm.barberId}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, barberId: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              >
                <option value="">General (all barbers)</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.user?.name || 'Barber'}
                  </option>
                ))}
              </select>
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
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#00f0ff]">Edit Service</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update information for {selectedService?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-gray-300">Name *</Label>
              <Input
                id="edit-name"
                value={editServiceForm.name}
                onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                placeholder="E.g.: Classic Cut"
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
                  placeholder="30"
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
                  placeholder="25.00"
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
                placeholder="Describe the service..."
                className="bg-[#0a0a0a] border-gray-700 text-white"
                rows={3}
              />
            </div>
            
            {/* REMOVED: Gender selector - Esta página solo gestiona servicios de HOMBRES */}
            <input type="hidden" name="edit-gender" value="MALE" />
            
            <div>
              <Label className="text-gray-300 flex items-center mb-3">
                <ImageIcon className="w-4 h-4 mr-2" />
                Service image
              </Label>
              
              {/* Preview de imagen */}
              {(editPreviewImage || editServiceForm.image) && (
                <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden">
                  <Image
                    src={editPreviewImage || editServiceForm.image}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditServiceForm({ ...editServiceForm, image: '' });
                      setEditPreviewImage(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload area */}
              {!editPreviewImage && !editServiceForm.image && (
                <div
                  onDrop={(e) => handleDrop(e, true)}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00f0ff] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, true)}
                    className="hidden"
                    id="edit-service-image"
                  />
                  <label htmlFor="edit-service-image" className="cursor-pointer">
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${uploadingImage ? 'text-[#00f0ff] animate-pulse' : 'text-gray-600'}`} />
                    <p className="text-gray-400 mb-2">
                      {uploadingImage ? 'Uploading...' : 'Drag an image or click to select'}
                    </p>
                    <p className="text-gray-600 text-sm">PNG, JPG (max 10MB)</p>
                  </label>
                </div>
              )}

              {/* Input manual de URL (opcional) */}
              {!editPreviewImage && !editServiceForm.image && (
                <div className="mt-3">
                  <p className="text-gray-500 text-sm mb-2">Or enter a URL:</p>
                  <Input
                    value={editServiceForm.image}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, image: e.target.value })}
                    placeholder="https://user-images.githubusercontent.com/11049488/92468872-25eef700-f1d4-11ea-99bd-9b45b526c94a.png"
                    className="bg-[#0a0a0a] border-gray-700 text-white"
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edit-barber" className="text-gray-300">Specific barber (optional)</Label>
              <select
                id="edit-barber"
                value={editServiceForm.barberId}
                onChange={(e) => setEditServiceForm({ ...editServiceForm, barberId: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              >
                <option value="">General (all barbers)</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.user?.name || 'Barber'}
                  </option>
                ))}
              </select>
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

      {/* Delete Service Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">Deactivate service?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to deactivate {selectedService?.name}?
              The service will not be permanently deleted, it will only be marked inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={submitting}
            >
              {submitting ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
