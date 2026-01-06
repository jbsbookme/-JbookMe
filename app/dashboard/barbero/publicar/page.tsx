'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Video, X, Upload, Loader2, ArrowLeft, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import Image from 'next/image';
import Link from 'next/link';

export default function BarberUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setFileType(file.type.startsWith('image/') ? 'image' : 'video');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }

    setIsUploading(true);

    try {
      // 1) Presign upload (avoids serverless body size limits)
      const presignRes = await fetch('/api/posts/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      if (!presignRes.ok) {
        let payload: any = null;
        try {
          payload = await presignRes.json();
        } catch {
          payload = { error: await presignRes.text() };
        }
        throw new Error(payload?.code ? `${payload.error} (${payload.code})` : (payload?.error || 'Failed to prepare upload'));
      }

      const { uploadUrl, cloud_storage_path } = await presignRes.json();

      // 2) Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed (S3)');
      }

      // 3) Create post record (no file body)
      const formData = new FormData();
      formData.append('caption', caption.trim());
      formData.append('cloud_storage_path', cloud_storage_path);
      
      // Add hashtags as array
      const hashtagArray = hashtags
        .split(/[,\s]+/)
        .map(tag => tag.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0);
      formData.append('hashtags', JSON.stringify(hashtagArray));

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let payload: any = null;
        try {
          payload = await res.json();
        } catch {
          payload = { error: await res.text() };
        }
        throw new Error(payload?.code ? `${payload.error} (${payload.code})` : (payload?.error || 'Failed to upload post'));
      }

      toast.success('✅ Published successfully. Preparing to share...');
      
      // Auto-share after successful upload
      const text = `${caption.trim()}\n\n${hashtagArray.map(tag => `#${tag}`).join(' ')}\n\nJb Barbershop • BookMe\nBook your appointment: https://www.jbsbookme.com`;
      
      // Try Web Share API first (works on mobile with image)
      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(previewUrl);
          const blob = await response.blob();
          const file = new File([blob], 'jbookme-work.jpg', { type: blob.type });
          
          const shareData = {
            text: text,
            files: [file]
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
          }
        } catch (error) {
          console.log('Web Share failed, using fallback');
          // Fallback: copy text and download image
          await navigator.clipboard.writeText(text);
          const a = document.createElement('a');
          a.href = previewUrl;
          a.download = 'jbookme-work.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.info('📋 Texto copiado e imagen descargada');
        }
      } else {
        // Desktop fallback
        await navigator.clipboard.writeText(text);
        const a = document.createElement('a');
        a.href = previewUrl;
        a.download = 'jbookme-work.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.info('📋 Text copied and image downloaded');
      }
      
      // Reset form
      handleRemoveFile();
      setCaption('');
      setHashtags('');
      
      // Redirect to dashboard after sharing
      setTimeout(() => {
        router.push('/dashboard/barbero');
      }, 1500);

    } catch (error: unknown) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to upload post');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard/barbero">
          <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Share Your Work
            </CardTitle>
            <p className="text-zinc-400 text-sm">
              Upload photos or videos of your cuts and show them in the feed.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              <div>
                <Label>Media</Label>
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center cursor-pointer hover:border-cyan-500 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-4">
                        <Camera className="w-10 h-10 text-zinc-500" />
                        <Video className="w-10 h-10 text-zinc-500" />
                      </div>
                      <p className="text-zinc-400">Click to upload photo or video</p>
                      <p className="text-xs text-zinc-600">Max size: 50MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 relative">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-800">
                      {fileType === 'image' ? (
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <video
                          src={previewUrl}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={handleRemoveFile}
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Caption */}
              <div>
                <Label htmlFor="caption">Caption *</Label>
                <Textarea
                  id="caption"
                  placeholder="Describe your work... (e.g., 'Fresh fade with beard lineup')"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-2 bg-zinc-800 border-zinc-700 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {caption.length}/500 characters
                </p>
              </div>

              {/* Hashtags */}
              <div>
                <Label htmlFor="hashtags">Hashtags (Optional)</Label>
                <Input
                  id="hashtags"
                  placeholder="fade, lineup, barberlife (separate with spaces or commas)"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="mt-2 bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {hashtags.split(/[,\s]+/).filter(t => t.length > 0).length} tags
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Publish
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Posting Guidelines</h4>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>Only upload your own work</li>
                  <li>Photos/videos should be clear and well-lit</li>
                  <li>Avoid personal information in photos</li>
                  <li>Your post appears in the feed after publishing</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
