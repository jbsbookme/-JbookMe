'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Inbox, Mail, MailOpen, ArrowLeft, MessageSquare, ImageIcon, X } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  imageUrl?: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  recipient: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  appointment?: {
    id: string;
    date: string;
    time: string;
    service: {
      name: string;
    };
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function InboxPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // New message form
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    content: '',
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const [receivedRes, sentRes] = await Promise.all([
        fetch('/api/messages?type=received'),
        fetch('/api/messages?type=sent'),
      ]);
      
      if (receivedRes.ok && sentRes.ok) {
        const receivedData = await receivedRes.json();
        const sentData = await sentRes.json();
        setReceivedMessages(receivedData.messages || []);
        setSentMessages(sentData.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error(t('messages.error.loadMessages'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/recipients');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('messages.error.loadRecipients'));
    }
  }, [t]);

  // Fetch messages
  useEffect(() => {
    if (status === 'authenticated') {
      fetchMessages();
      fetchUsers();
    }
  }, [status, fetchMessages, fetchUsers]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('messages.error.imageSize10MB'));
        return;
      }
      setNewMessage({ ...newMessage, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setNewMessage({ ...newMessage, image: null });
    setImagePreview(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.recipientId || !newMessage.content.trim()) {
      toast.error(t('inbox.selectRecipientError') + ' ' + t('inbox.writeMessageError'));
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      formData.append('recipientId', newMessage.recipientId);
      formData.append('content', newMessage.content);
      if (newMessage.image) {
        formData.append('image', newMessage.image);
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success(t('inbox.messageSent'));
        setNewMessage({ recipientId: '', content: '', image: null });
        setImagePreview(null);
        setDialogOpen(false);
        await fetchMessages();
      } else {
        const error = await response.json();
        toast.error(error.error || t('inbox.errorSending'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('inbox.errorSending'));
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
      if (response.ok) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  const unreadCount = receivedMessages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-[#111111] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HistoryBackButton
                fallbackHref="/menu"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </HistoryBackButton>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-[#00f0ff] to-[#ffd700] rounded-lg">
                  <MessageSquare className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t('inbox.title')}</h1>
                  <p className="text-sm text-gray-400">{t('inbox.subtitle')}</p>
                </div>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold hover:opacity-90 shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                  <Send className="h-4 w-4 mr-2" />
                  {t('inbox.compose')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111111] border-gray-800 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-bold text-[#00f0ff]">{t('inbox.sendNewMessage')}</DialogTitle>
                  <DialogDescription className="text-gray-400 text-sm">
                    {t('inbox.selectRecipientAndWrite')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient" className="text-sm font-medium">{t('inbox.recipient')}</Label>
                    <Select
                      value={newMessage.recipientId}
                      onValueChange={(value) => setNewMessage({ ...newMessage, recipientId: value })}
                    >
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                        <SelectValue placeholder={t('inbox.selectRecipient')} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-700">
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role === 'BARBER' || user.role === 'STYLIST' ? t('inbox.barber') : t('inbox.client')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-sm font-medium">Message</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your message here..."
                      value={newMessage.content}
                      onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                      className="bg-[#1a1a1a] border-gray-700 min-h-[120px] resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="image" className="text-xs sm:text-sm">Image (optional)</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="bg-[#1a1a1a] border-gray-700 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                    {imagePreview && (
                      <div className="relative w-full h-40 mt-3">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Image (optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('message-image')?.click()}
                      className="w-full border-gray-700 hover:bg-[#1a1a1a]"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Attach Image
                    </Button>
                    <Input
                      id="message-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)} 
                    className="border-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.recipientId || !newMessage.content.trim()}
                    className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="received" className="space-y-6">
          <TabsList className="bg-[#111111] border border-gray-800">
            <TabsTrigger value="received" className="data-[state=active]:bg-[#00f0ff] data-[state=active]:text-black">
              <Inbox className="h-4 w-4 mr-2" />
              {t('inbox.received')}
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-black">
              <Send className="h-4 w-4 mr-2" />
              {t('inbox.sent')}
            </TabsTrigger>
          </TabsList>

          {/* Received Messages */}
          <TabsContent value="received">
            {receivedMessages.length === 0 ? (
              <Card className="bg-[#111111] border-gray-800">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-16 w-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">{t('inbox.noReceivedMessages')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {receivedMessages.map((message) => (
                  <Card
                    key={message.id}
                    className={`bg-[#111111] border-gray-800 hover:border-[#00f0ff] transition-colors cursor-pointer ${
                      !message.read ? 'border-[#00f0ff]/50' : ''
                    }`}
                    onClick={() => !message.read && markAsRead(message.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border-2 border-[#00f0ff]">
                          <AvatarImage src={message.sender.image} />
                          <AvatarFallback className="bg-[#00f0ff] text-black">
                            {message.sender.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#00f0ff]">{message.sender.name}</p>
                              {!message.read && (
                                <Badge className="bg-[#00f0ff] text-black">{t('inbox.newBadge')}</Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-400">{formatDate(message.createdAt)}</span>
                          </div>
                          <p className="text-gray-300">{message.content}</p>
                          {message.imageUrl && (
                            <div className="relative w-full h-48 mt-2">
                              <Image
                                src={message.imageUrl}
                                alt="Attached image"
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                          {message.appointment && (
                            <div className="mt-2 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                              <p className="text-sm text-gray-400">Related to appointment:</p>
                              <p className="text-sm font-medium text-[#ffd700]">
                                {message.appointment.service.name} - {message.appointment.date} at {message.appointment.time}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sent Messages */}
          <TabsContent value="sent">
            {sentMessages.length === 0 ? (
              <Card className="bg-[#111111] border-gray-800">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MailOpen className="h-16 w-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">{t('inbox.noSentMessages')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sentMessages.map((message) => (
                  <Card
                    key={message.id}
                    className="bg-[#111111] border-gray-800 hover:border-[#ffd700] transition-colors"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border-2 border-[#ffd700]">
                          <AvatarImage src={message.recipient.image} />
                          <AvatarFallback className="bg-[#ffd700] text-black">
                            {message.recipient.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-[#ffd700]">{t('inbox.for')}: {message.recipient.name}</p>
                            <span className="text-sm text-gray-400">{formatDate(message.createdAt)}</span>
                          </div>
                          <p className="text-gray-300">{message.content}</p>
                          {message.imageUrl && (
                            <div className="relative w-full h-48 mt-2">
                              <Image
                                src={message.imageUrl}
                                alt="Attached image"
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                          {message.appointment && (
                            <div className="mt-2 p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                              <p className="text-sm text-gray-400">Related to appointment:</p>
                              <p className="text-sm font-medium text-[#ffd700]">
                                {message.appointment.service.name} - {message.appointment.date} at {message.appointment.time}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
