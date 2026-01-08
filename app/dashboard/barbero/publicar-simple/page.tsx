'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Video, X, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import Link from 'next/link';
import Image from 'next/image';

export default function SimpleUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
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

    setIsUploading(true);

    try {
      // Step 1: Upload file using Vercel Blob
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const uploadRes = await fetch('/api/posts/upload-blob', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const { cloud_storage_path, fileUrl } = await uploadRes.json();
      
      toast.success('File uploaded! Creating post...');

      // Step 2: Create post
      const postFormData = new FormData();
      postFormData.append('caption', caption.trim());
      postFormData.append('cloud_storage_path', cloud_storage_path);
      
      const hashtagArray = hashtags
        .split(/[,\s]+/)
        .map(tag => tag.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0);
      postFormData.append('hashtags', JSON.stringify(hashtagArray));

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        body: postFormData,
      });

      if (!postRes.ok) {
        const errorData = await postRes.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      toast.success('✅ Post published successfully!');

      // Reset form
      handleRemoveFile();
      setCaption('');
      setHashtags('');

      // Redirect
      setTimeout(() => {
        router.push('/feed');
      }, 1500);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload post');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-32">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/barbero">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="glass border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Upload className="w-6 h-6 text-cyan-400" />
              Publish New Post (Simple Upload)
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              Share your best work with the community
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Input */}
              <div>
                <Label className="text-white mb-2 block">Media (Photo or Video)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />

                {!selectedFile ? (
                  <label
                    htmlFor="file-input"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-cyan-500/30 rounded-lg cursor-pointer bg-black/20 hover:bg-black/40 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {fileType === 'image' ? (
                        <Camera className="w-12 h-12 text-cyan-400 mb-3" />
                      ) : fileType === 'video' ? (
                        <Video className="w-12 h-12 text-pink-400 mb-3" />
                      ) : (
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      )}
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">Image or Video (MAX 50MB)</p>
                    </div>
                  </label>
                ) : (
                  <div className="relative w-full h-64 rounded-lg overflow-hidden bg-black">
                    {fileType === 'image' && previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    ) : fileType === 'video' && previewUrl ? (
                      <video
                        src={previewUrl}
                        className="w-full h-full object-contain"
                        controls
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <Label htmlFor="caption" className="text-white mb-2 block">
                  Caption
                </Label>
                <Textarea
                  id="caption"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
                />
              </div>

              {/* Hashtags */}
              <div>
                <Label htmlFor="hashtags" className="text-white mb-2 block">
                  Hashtags
                </Label>
                <Input
                  id="hashtags"
                  placeholder="#barber #fade #haircut"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate with spaces or commas
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-6 text-lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Publish Post
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
