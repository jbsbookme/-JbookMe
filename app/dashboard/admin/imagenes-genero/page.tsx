'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, User, ArrowLeft, Info, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GenderImagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [maleImage, setMaleImage] = useState<string | null>(null);
  const [femaleImage, setFemaleImage] = useState<string | null>(null);
  const [galleryMaleCircleImage, setGalleryMaleCircleImage] = useState<string | null>(null);
  const [galleryFemaleCircleImage, setGalleryFemaleCircleImage] = useState<string | null>(null);
  const [malePreview, setMalePreview] = useState<string | null>(null);
  const [femalePreview, setFemalePreview] = useState<string | null>(null);
  const [galleryMalePreview, setGalleryMalePreview] = useState<string | null>(null);
  const [galleryFemalePreview, setGalleryFemalePreview] = useState<string | null>(null);
  const [maleFileInfo, setMaleFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [femaleFileInfo, setFemaleFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [galleryMaleFileInfo, setGalleryMaleFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [galleryFemaleFileInfo, setGalleryFemaleFileInfo] = useState<{ name: string; size: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user?.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchCurrentImages();
  }, []);

  const fetchCurrentImages = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.maleGenderImage) {
          setMaleImage(data.maleGenderImage);
          setMalePreview(data.maleGenderImage);
        }
        if (data.femaleGenderImage) {
          setFemaleImage(data.femaleGenderImage);
          setFemalePreview(data.femaleGenderImage);
        }

        if (data.galleryMaleCircleImage) {
          setGalleryMaleCircleImage(data.galleryMaleCircleImage);
          setGalleryMalePreview(data.galleryMaleCircleImage);
        }
        if (data.galleryFemaleCircleImage) {
          setGalleryFemaleCircleImage(data.galleryFemaleCircleImage);
          setGalleryFemalePreview(data.galleryFemaleCircleImage);
        }
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleImageUpload = async (
    file: File,
    type: 'male' | 'female' | 'galleryMale' | 'galleryFemale'
  ) => {
    if (!file) {
      toast.error('No file selected');
      return;
    }

    console.log('[Upload] Starting upload for:', { name: file.name, type: file.type, size: file.size });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    // Set file info
    const fileInfo = {
      name: file.name,
      size: formatFileSize(file.size)
    };
    
    if (type === 'male') setMaleFileInfo(fileInfo);
    else if (type === 'female') setFemaleFileInfo(fileInfo);
    else if (type === 'galleryMale') setGalleryMaleFileInfo(fileInfo);
    else setGalleryFemaleFileInfo(fileInfo);

    setLoading(true);
    const loadingToast = toast.loading('Uploading image...');

    try {
      // Upload locally (no AWS needed)
      const formData = new FormData();
      formData.append('image', file);

      console.log('[Upload] Sending to API...');

      const uploadRes = await fetch('/api/gallery/upload-local', {
        method: 'POST',
        body: formData,
      });

      console.log('[Upload] Response status:', uploadRes.status);

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error('[Upload] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Error al subir imagen: ${errorText}`);
        }
        throw new Error(errorData.error || 'Error al subir imagen');
      }

      const responseData = await uploadRes.json();
      console.log('[Upload] Success response:', responseData);
      const { url } = responseData;

      // Update settings
      const settingsData =
        type === 'male'
          ? { maleGenderImage: url }
          : type === 'female'
            ? { femaleGenderImage: url }
            : type === 'galleryMale'
              ? { galleryMaleCircleImage: url }
              : { galleryFemaleCircleImage: url };

      const settingsRes = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (!settingsRes.ok) {
        const errorData = await settingsRes.json();
        throw new Error(errorData.error || 'Error updating settings');
      }

      // Update state
      if (type === 'male') {
        setMaleImage(url);
        setMalePreview(url);
      } else if (type === 'female') {
        setFemaleImage(url);
        setFemalePreview(url);
      } else if (type === 'galleryMale') {
        setGalleryMaleCircleImage(url);
        setGalleryMalePreview(url);
      } else {
        setGalleryFemaleCircleImage(url);
        setGalleryFemalePreview(url);
      }

      toast.dismiss(loadingToast);
      const label =
        type === 'male'
          ? 'Barber'
          : type === 'female'
            ? 'Stylist'
            : type === 'galleryMale'
              ? 'Gallery Men'
              : 'Gallery Women';
      toast.success(`✓ ${label} image updated successfully`);
    } catch (error: unknown) {
      console.error('[Upload] Error:', error);
      toast.dismiss(loadingToast);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Error updating image');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (type: 'male' | 'female') => {
    setLoading(true);

    try {
      const settingsData = type === 'male' 
        ? { maleGenderImage: null }
        : { femaleGenderImage: null };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error deleting image');
      }

      if (type === 'male') {
        setMaleImage(null);
        setMalePreview(null);
      } else {
        setFemaleImage(null);
        setFemalePreview(null);
      }

      toast.success(`${type === 'male' ? 'Barber' : 'Stylist'} image deleted`);
    } catch (error: unknown) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Error deleting image');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGalleryCircleImage = async (type: 'galleryMale' | 'galleryFemale') => {
    setLoading(true);

    try {
      const settingsData = type === 'galleryMale'
        ? { galleryMaleCircleImage: null }
        : { galleryFemaleCircleImage: null };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error deleting image');
      }

      if (type === 'galleryMale') {
        setGalleryMaleCircleImage(null);
        setGalleryMalePreview(null);
        setGalleryMaleFileInfo(null);
      } else {
        setGalleryFemaleCircleImage(null);
        setGalleryFemalePreview(null);
        setGalleryFemaleFileInfo(null);
      }

      toast.success(`${type === 'galleryMale' ? 'Gallery Men' : 'Gallery Women'} image deleted`);
    } catch (error: unknown) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Error deleting image');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
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
            <h1 className="text-3xl font-bold text-white">Visual Configuration</h1>
          </div>
          <p className="text-gray-400">Manage key system images - Barber and Stylist</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Male Image Card */}
          <Card className="bg-gray-900 border-blue-500/30 hover:border-[#00f0ff] transition-all">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#00f0ff]" />
                Image - Barber
              </CardTitle>
              <CardDescription>Services for gentlemen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="relative w-full aspect-square bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-lg overflow-hidden flex items-center justify-center group">
                {malePreview ? (
                  <>
                    <Image
                      src={malePreview}
                      alt="Male Gender"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-[#00f0ff]" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <User className="w-24 h-24 text-[#00f0ff]/50" />
                    <p className="text-sm text-gray-500">No image</p>
                  </div>
                )}
              </div>
              
              {/* File Info */}
              {maleFileInfo && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 p-2 rounded">
                  <ImageIcon className="w-4 h-4 text-[#00f0ff]" />
                  <span className="truncate flex-1">{maleFileInfo.name}</span>
                  <span className="text-[#00f0ff]">{maleFileInfo.size}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'male');
                    }}
                    disabled={loading}
                  />
                  <div className="w-full h-10 bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black rounded-md flex items-center justify-center font-medium hover:opacity-90 transition-opacity">
                    <Upload className="w-4 h-4 mr-2" />
                    {maleImage ? 'Change' : 'Upload'}
                  </div>
                </label>
                {maleImage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleRemoveImage('male')}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Female Image Card */}
          <Card className="bg-gray-900 border-pink-500/30 hover:border-[#ffd700] transition-all">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#ffd700]" />
                Image - Stylist
              </CardTitle>
              <CardDescription>Services for ladies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="relative w-full aspect-square bg-gradient-to-br from-pink-900/40 to-purple-900/40 rounded-lg overflow-hidden flex items-center justify-center group">
                {femalePreview ? (
                  <>
                    <Image
                      src={femalePreview}
                      alt="Female Gender"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-[#ffd700]" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <User className="w-24 h-24 text-[#ffd700]/50" />
                    <p className="text-sm text-gray-500">No image</p>
                  </div>
                )}
              </div>
              
              {/* File Info */}
              {femaleFileInfo && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 p-2 rounded">
                  <ImageIcon className="w-4 h-4 text-[#ffd700]" />
                  <span className="truncate flex-1">{femaleFileInfo.name}</span>
                  <span className="text-[#ffd700]">{femaleFileInfo.size}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'female');
                    }}
                    disabled={loading}
                  />
                  <div className="w-full h-10 bg-gradient-to-r from-[#ffd700] to-[#ff6b6b] text-black rounded-md flex items-center justify-center font-medium hover:opacity-90 transition-opacity">
                    <Upload className="w-4 h-4 mr-2" />
                    {femaleImage ? 'Change' : 'Upload'}
                  </div>
                </label>
                {femaleImage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleRemoveImage('female')}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-white mb-2">Gallery cards (circle photos)</h2>
          <p className="text-gray-400 text-sm mb-6">These images appear inside the circle on the Men&apos;s Cuts / Women&apos;s Cuts cards in Galería → Get Inspired.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gallery Men Circle */}
            <Card className="bg-gray-900 border-blue-500/30 hover:border-[#00f0ff] transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#00f0ff]" />
                  Gallery Men (Circle)
                </CardTitle>
                <CardDescription>Small circle photo on the Men&apos;s Cuts card</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative w-full aspect-square bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-lg overflow-hidden flex items-center justify-center group">
                  {galleryMalePreview ? (
                    <Image src={galleryMalePreview} alt="Gallery Men" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <ImageIcon className="w-24 h-24 text-[#00f0ff]/50" />
                      <p className="text-sm text-gray-500">No image</p>
                    </div>
                  )}
                </div>

                {galleryMaleFileInfo && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 p-2 rounded">
                    <ImageIcon className="w-4 h-4 text-[#00f0ff]" />
                    <span className="truncate flex-1">{galleryMaleFileInfo.name}</span>
                    <span className="text-[#00f0ff]">{galleryMaleFileInfo.size}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'galleryMale');
                      }}
                      disabled={loading}
                    />
                    <div className="w-full h-10 bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black rounded-md flex items-center justify-center font-medium hover:opacity-90 transition-opacity">
                      <Upload className="w-4 h-4 mr-2" />
                      {galleryMaleCircleImage ? 'Change' : 'Upload'}
                    </div>
                  </label>
                  {galleryMaleCircleImage && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      onClick={() => handleRemoveGalleryCircleImage('galleryMale')}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gallery Women Circle */}
            <Card className="bg-gray-900 border-pink-500/30 hover:border-[#ffd700] transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#ffd700]" />
                  Gallery Women (Circle)
                </CardTitle>
                <CardDescription>Small circle photo on the Women&apos;s Cuts card</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative w-full aspect-square bg-gradient-to-br from-pink-900/40 to-purple-900/40 rounded-lg overflow-hidden flex items-center justify-center group">
                  {galleryFemalePreview ? (
                    <Image src={galleryFemalePreview} alt="Gallery Women" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <ImageIcon className="w-24 h-24 text-[#ffd700]/50" />
                      <p className="text-sm text-gray-500">No image</p>
                    </div>
                  )}
                </div>

                {galleryFemaleFileInfo && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 p-2 rounded">
                    <ImageIcon className="w-4 h-4 text-[#ffd700]" />
                    <span className="truncate flex-1">{galleryFemaleFileInfo.name}</span>
                    <span className="text-[#ffd700]">{galleryFemaleFileInfo.size}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'galleryFemale');
                      }}
                      disabled={loading}
                    />
                    <div className="w-full h-10 bg-gradient-to-r from-[#ffd700] to-[#ff6b6b] text-black rounded-md flex items-center justify-center font-medium hover:opacity-90 transition-opacity">
                      <Upload className="w-4 h-4 mr-2" />
                      {galleryFemaleCircleImage ? 'Change' : 'Upload'}
                    </div>
                  </label>
                  {galleryFemaleCircleImage && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      onClick={() => handleRemoveGalleryCircleImage('galleryFemale')}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-cyan-900/20 border-cyan-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Image usage</h3>
                  <p className="text-sm text-gray-400">
                    These images appear on the booking page when the client selects their gender. 
                    The <strong className="text-cyan-400">Barber</strong> image is shown for men&apos;s services 
                    and the <strong className="text-[#ffd700]">Stylist</strong> image for women&apos;s services.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Recommendations</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Format: JPG, PNG or WEBP</li>
                    <li>• Minimum size: 300x300px (square)</li>
                    <li>• Maximum weight: 10MB</li>
                    <li>• Displayed as a circle</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
