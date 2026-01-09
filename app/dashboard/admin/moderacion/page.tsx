'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, Eye, User, Scissors, Image as ImageIcon, Video, AlertCircle, ArrowLeft, RefreshCw, Search, Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';

type Post = {
  id: string;
  caption: string;
  hashtags: string[];
  cloud_storage_path: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  postType: 'BARBER_WORK' | 'CLIENT_SHARE';
  authorType: 'USER' | 'BARBER';
  likes: number;
  viewCount: number;
  rejectionReason?: string;
  createdAt: string;
  author?: {
    name: string;
    email: string;
  };
  barber?: {
    name: string;
  };
};

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

export default function AdminModerationPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // Show all posts by default
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'BARBER_WORK' | 'CLIENT_SHARE'>('all');
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [_viewDialogOpen, setViewDialogOpen] = useState(false);
  const [_viewingPost, setViewingPost] = useState<Post | null>(null);

  const predefinedReasons = [
    'Inappropriate or offensive content',
    'Very low image quality',
    'Not related to barbershop',
    'Personal information visible',
    'Duplicate content',
    'Copyright violation'
  ];

  const fetchPosts = async (status?: string) => {
    try {
      const url = status ? `/api/posts?status=${status}` : '/api/posts';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Error loading posts');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      const allPosts = data.posts || [];
      
      setStats({
        pending: allPosts.filter((p: Post) => p.status === 'PENDING').length,
        approved: allPosts.filter((p: Post) => p.status === 'APPROVED').length,
        rejected: allPosts.filter((p: Post) => p.status === 'REJECTED').length,
        total: allPosts.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      await fetchPosts(activeTab === 'all' ? undefined : activeTab.toUpperCase());
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  const handleAction = async () => {
    if (!selectedPost) return;
    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          reason: actionType === 'reject' ? rejectionReason.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process action');
      }

      toast.success(`Post ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      
      // Refresh data
      await fetchStats();
      await fetchPosts(activeTab === 'all' ? undefined : activeTab.toUpperCase());
      
      // Close dialog
      setActionDialogOpen(false);
      setSelectedPost(null);
      setRejectionReason('');
    } catch (error: unknown) {
      console.error('Error processing action:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to process action');
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (post: Post, action: 'approve' | 'reject') => {
    setSelectedPost(post);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const getMediaUrl = (cloud_storage_path: string) => {
    // If already a full URL, return as is
    if (cloud_storage_path.startsWith('http://') || cloud_storage_path.startsWith('https://')) {
      return cloud_storage_path;
    }
    
    // Check if it's a local upload
    if (cloud_storage_path.startsWith('/uploads/')) {
      return cloud_storage_path;
    }
    
    // Otherwise, assume S3
    const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
    if (!bucketName) return cloud_storage_path;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  };

  const isVideo = (path: string) => {
    return path.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.barber?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || post.postType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const toggleSelection = (postId: string) => {
    const newSelection = new Set(selectedPosts);
    if (newSelection.has(postId)) {
      newSelection.delete(postId);
    } else {
      newSelection.add(postId);
    }
    setSelectedPosts(newSelection);
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedPosts.size === 0) {
      toast.error('Select at least one post');
      return;
    }

    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error('Provide a reason to reject');
      return;
    }

    setProcessing(true);
    let successCount = 0;

    try {
      for (const postId of selectedPosts) {
        const res = await fetch(`/api/posts/${postId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            reason: action === 'reject' ? rejectionReason.trim() : undefined,
          }),
        });

        if (res.ok) successCount++;
      }

      toast.success(`${successCount} posts ${action === 'approve' ? 'approved' : 'rejected'}`);
      setSelectedPosts(new Set());
      await fetchStats();
      await fetchPosts(activeTab === 'all' ? undefined : activeTab.toUpperCase());
    } catch (error) {
      toast.error('Error in bulk action');
    } finally {
      setProcessing(false);
      setRejectionReason('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  const handleDeletePost = async (post: Post) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete post');
      }

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setSelectedPosts((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
      toast.success('Post deleted');
      fetchStats();
    } catch (error: unknown) {
      console.error('Error deleting post:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Error deleting post');
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/admin">
                <Button variant="outline" size="icon" className="border-gray-700 hover:border-[#00f0ff] flex-shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Content Moderation
                </h1>
                <p className="text-zinc-400 mt-1 text-sm sm:text-base">Review and approve user-generated content</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                fetchStats();
                fetchPosts(activeTab === 'all' ? undefined : activeTab.toUpperCase());
                toast.success('Updated');
              }}
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by caption, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as 'all' | 'BARBER_WORK' | 'CLIENT_SHARE')
              }
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All types</option>
              <option value="BARBER_WORK">Barber Work</option>
              <option value="CLIENT_SHARE">Shared by Client</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedPosts.size > 0 && (
            <div className="bg-cyan-900/20 border border-cyan-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-cyan-400 font-semibold">
                  {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('approve')}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve all
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActionType('reject');
                      setActionDialogOpen(true);
                    }}
                    disabled={processing}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPosts(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Approved</p>
                  <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Rejected</p>
                  <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Posts</p>
                  <p className="text-3xl font-bold text-cyan-400">{stats.total}</p>
                </div>
                <Eye className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-zinc-900 gap-1 p-1">
            <TabsTrigger 
              value="pending" 
              onClick={() => setActiveTab('pending')}
              className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm py-2 sm:py-3"
            >
              <span className="hidden sm:inline">Pending </span>
              <span className="sm:hidden">Pend. </span>
              ({stats.pending})
            </TabsTrigger>
            <TabsTrigger 
              value="approved" 
              onClick={() => setActiveTab('approved')}
              className="data-[state=active]:bg-green-500 data-[state=active]:text-black text-xs sm:text-sm py-2 sm:py-3"
            >
              <span className="hidden sm:inline">Approved </span>
              <span className="sm:hidden">Appr. </span>
              ({stats.approved})
            </TabsTrigger>
            <TabsTrigger 
              value="rejected" 
              onClick={() => setActiveTab('rejected')}
              className="data-[state=active]:bg-red-500 data-[state=active]:text-black text-xs sm:text-sm py-2 sm:py-3"
            >
              <span className="hidden sm:inline">Rejected </span>
              <span className="sm:hidden">Rejec. </span>
              ({stats.rejected})
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              onClick={() => setActiveTab('all')}
              className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-xs sm:text-sm py-2 sm:py-3"
            >
              All ({stats.total})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredPosts.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">
                    {searchQuery || filterType !== 'all' ? 'No posts found with these filters' : 'No posts'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPosts.map((post) => (
                  <Card key={post.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Media Preview */}
                      <div className="relative w-full aspect-square bg-zinc-800 cursor-pointer" onClick={() => {
                        setViewingPost(post);
                        setViewDialogOpen(true);
                      }}>
                        {/* Selection Checkbox */}
                        {post.status === 'PENDING' && (
                          <div className="absolute top-3 left-3 z-10">
                            <input
                              type="checkbox"
                              checked={selectedPosts.has(post.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelection(post.id);
                              }}
                              className="w-5 h-5 rounded border-2 border-cyan-500 bg-zinc-900 checked:bg-cyan-500 cursor-pointer"
                            />
                          </div>
                        )}
                        {isVideo(post.cloud_storage_path) ? (
                          <div className="relative w-full h-full">
                            <video
                              src={getMediaUrl(post.cloud_storage_path)}
                              controls
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 right-3 bg-black/70 rounded-full p-2">
                              <Video className="w-5 h-5 text-cyan-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full">
                            <Image
                              src={getMediaUrl(post.cloud_storage_path)}
                              alt={post.caption}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute top-3 right-3 bg-black/70 rounded-full p-2">
                              <ImageIcon className="w-5 h-5 text-cyan-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Post Info */}
                      <div className="p-4 space-y-3">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                          {post.authorType === 'BARBER' ? (
                            <>
                              <Scissors className="w-4 h-4 text-cyan-400" />
                              <span className="text-sm font-semibold text-cyan-400">
                                {post.barber?.name || 'Barber'}
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 text-pink-400" />
                              <span className="text-sm font-semibold text-pink-400">
                                {post.author?.name || 'Client'}
                              </span>
                            </>
                          )}
                          <Badge
                            variant="outline"
                            className={`ml-auto ${
                              post.postType === 'BARBER_WORK'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-pink-500 text-pink-400'
                            }`}
                          >
                            {post.postType === 'BARBER_WORK' ? 'Barber Work' : 'Client Share'}
                          </Badge>
                        </div>

                        {/* Caption */}
                        <p className="text-zinc-300 text-sm line-clamp-3">{post.caption}</p>

                        {/* Hashtags */}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {post.hashtags.slice(0, 5).map((tag, i) => (
                              <span key={i} className="text-xs text-cyan-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            <span>{post.likes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{post.viewCount || 0}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                          <Badge
                            className={`${
                              post.status === 'PENDING'
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                                : post.status === 'APPROVED'
                                ? 'bg-green-500/20 text-green-400 border-green-500'
                                : 'bg-red-500/20 text-red-400 border-red-500'
                            }`}
                          >
                            {post.status}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePost(post)}
                            className="ml-auto text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                            aria-label="Delete post"
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Rejection Reason */}
                        {post.status === 'REJECTED' && post.rejectionReason && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-xs text-red-400">
                              <strong>Reason:</strong> {post.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {post.status === 'PENDING' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={() => openActionDialog(post, 'approve')}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => openActionDialog(post, 'reject')}
                              variant="destructive"
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {actionType === 'approve' ? 'Approve Post' : 'Reject Post'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {actionType === 'approve'
                ? 'This post will be published and visible to all users.'
                : 'Please provide a reason for rejection. The author will be notified.'}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Rejection Reason *</label>
              
              {/* Predefined Reasons */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Common reasons:</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReason(reason)}
                      className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded border border-zinc-700 hover:border-cyan-500 transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
              
              <Textarea
                placeholder="Or write your own reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-zinc-800 border-zinc-700 min-h-[100px]"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setRejectionReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
