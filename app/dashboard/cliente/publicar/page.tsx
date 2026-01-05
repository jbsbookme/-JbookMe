'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Video, X, Upload, Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardNavbar } from '@/components/dashboard/navbar';

export default function ClientUploadPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

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
      toast.error(t('messages.error.selectPhotoOrVideo'));
      return;
    }

    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caption', caption.trim());
      formData.append('postType', 'CLIENT_SHARE');
      
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
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload post');
      }

      toast.success('Post published. Preparing to share...');
      
      // Auto-share after successful upload
      const text = `${caption.trim()}\n\n${hashtagArray.map(tag => `#${tag}`).join(' ')}\n\nJb Barbershop • BookMe\nBook your appointment: https://www.jbsbookme.com`;
      
      // Try Web Share API first (works on mobile with image)
      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(previewUrl);
          const blob = await response.blob();
          const file = new File([blob], 'jbookme-style.jpg', { type: blob.type });
          
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
          a.download = 'jbookme-style.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.info('Text copied and media downloaded');
        }
      } else {
        // Desktop fallback
        await navigator.clipboard.writeText(text);
        const a = document.createElement('a');
        a.href = previewUrl;
        a.download = 'jbookme-style.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.info('Text copied and media downloaded');
      }
      
      // Reset form
      handleRemoveFile();
      setCaption('');
      setHashtags('');
      
      // Redirect to feed after sharing
      setTimeout(() => {
        router.push('/feed');
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
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
              {t('client.shareYourStyle')}
            </CardTitle>
            <p className="text-zinc-400 text-sm">
              {t('client.shareDescription')}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              <div>
                <Label className="text-white font-semibold">{t('client.photoOrVideo')} *</Label>
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center cursor-pointer hover:border-pink-500 hover:bg-zinc-800/50 transition-all"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex gap-6">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-2">
                            <Camera className="w-8 h-8 text-pink-400" />
                          </div>
                          <span className="text-xs text-zinc-400">{t('client.photo')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                            <Video className="w-8 h-8 text-purple-400" />
                          </div>
                          <span className="text-xs text-zinc-400">{t('client.video')}</span>
                        </div>
                      </div>
                      <p className="text-zinc-300 font-medium">{t('client.clickToUpload')}</p>
                      <p className="text-xs text-zinc-500">PNG, JPG, MP4, MOV (max. 50MB)</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 relative">
                    <div className="w-full rounded-lg overflow-hidden bg-zinc-800 border-2 border-pink-500/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center">
                          {fileType === 'video' ? (
                            <Video className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Camera className="w-5 h-5 text-pink-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-semibold truncate">
                            {selectedFile?.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleRemoveFile}
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-full text-xs text-white">
                      {fileType === 'image' ? '📷 Photo' : '🎥 Video'}
                    </div>
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
                <Label htmlFor="caption" className="text-white font-semibold">{t('client.description')} *</Label>
                <Textarea
                  id="caption"
                  placeholder={t('client.descriptionPlaceholder')}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-2 bg-zinc-800 border-zinc-700 min-h-[100px] text-white placeholder:text-zinc-500"
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {caption.length}/500 {t('client.characters')}
                </p>
              </div>

              {/* Hashtags */}
              <div>
                <Label htmlFor="hashtags" className="text-white font-semibold">{t('client.hashtags')} ({t('client.optional')})</Label>
                <Input
                  id="hashtags"
                  placeholder={t('client.hashtagsPlaceholder')}
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="mt-2 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {hashtags.split(/[,\s]+/).filter(t => t.length > 0).length} {t('client.tags')}
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={status !== 'authenticated' || isUploading || !selectedFile || !caption.trim()}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-pink-400 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Community Guidelines
                </h4>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>Share fresh looks and real experiences</li>
                  <li>Be respectful and keep it professional</li>
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
