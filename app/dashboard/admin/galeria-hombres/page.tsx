'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Upload, Trash2, Image as ImageIcon, Loader2, ImagePlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { toast } from 'sonner';

interface GalleryImage {
  id: string;
  cloud_storage_path: string;
  caption: string | null;
  barberId: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNISEX';
  createdAt: string;
  imageUrl?: string;
  barber?: {
    user: {
      name: string;
    };
  };
}

export default function GaleriaHombresPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchImages();
  }, [session, status, router]);

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/gallery?gender=MALE&includeInactive=false');
      const data = await res.json();
      if (res.ok) {
        // Filtrar solo imágenes MALE (doble verificación)
        const maleImages = Array.isArray(data) ? data.filter((img: GalleryImage) => img.gender === 'MALE') : [];
        setImages(maleImages);
        console.log(`✅ Men's Gallery: ${maleImages.length} images loaded`);
      } else {
        toast.error('Error loading images');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Error loading images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must not exceed 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      // Paso 1: Subir imagen
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/gallery/upload-image', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        toast.error(uploadData.error || 'Error al subir imagen');
        setUploading(false);
        return;
      }

      // Paso 2: Crear registro en BD con género MALE
      const createRes = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: uploadData.cloud_storage_path,
          title: caption || 'Corte masculino',
          description: caption || 'Corte masculino',
          gender: 'MALE',
          tags: [],
          order: 0
        })
      });

      if (createRes.ok) {
        toast.success('Image uploaded successfully');
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        fetchImages();
      } else {
        const createData = await createRes.json();
        toast.error(createData.error || 'Error creating record');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Image deleted');
        fetchImages();
      } else {
        toast.error('Error deleting image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Error deleting image');
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
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />
      
      <div className="container mx-auto px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/admin')}
                className="text-gray-400 hover:text-cyan-400 hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  <span className="text-[#00f0ff]">Men&apos;s </span>
                  <span className="text-white">Gallery</span>
                </h1>
              </div>
            </div>
            <p className="text-gray-400">Manage men&apos;s haircut images ({images.length} photos)</p>
          </div>

          {/* Upload Section */}
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-[#00f0ff] flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                Upload New Image (Men)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Image
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-700 rounded-lg hover:border-[#00f0ff] transition-colors cursor-pointer bg-gray-800/50"
                      >
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-300">
                          {selectedFile ? selectedFile.name : 'Click to select'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="E.g.: Classic fade, Modern cut..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] focus:border-transparent"
                    />
                  </div>
                </div>

                {previewUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-300 mb-2">Preview:</p>
                    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-800">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setCaption('');
                    }}
                    disabled={!selectedFile || uploading}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Grid */}
          {images.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-16 text-center">
                <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No images yet</p>
                <p className="text-gray-500 text-sm mt-2">Upload the first men&apos;s haircut image</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all duration-300 group overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-square bg-gray-800">
                        {image.imageUrl ? (
                          <Image
                            src={image.imageUrl}
                            alt={image.caption || 'Gallery image'}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <ImageIcon className="w-16 h-16" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            {image.caption && (
                              <p className="text-white text-sm font-medium mb-2">{image.caption}</p>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50">
                                👨 Man
                              </span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(image.id)}
                                className="bg-red-500/80 hover:bg-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
