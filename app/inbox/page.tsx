'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, Send, Reply, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
    role?: string | null;
  };
  recipient?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
    role?: string | null;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchMessages();
      fetchUsers();
    }
  }, [session]);

  const fetchMessages = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch('/api/messages?type=received'),
        fetch('/api/messages?type=sent'),
      ]);

      if (receivedRes.ok) {
        const data = await receivedRes.json();
        const list = Array.isArray(data?.messages) ? data.messages : [];
        setReceivedMessages(list);
        setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : list.filter((m: Message) => !m.isRead).length);
      } else {
        setReceivedMessages([]);
        setUnreadCount(0);
      }

      if (sentRes.ok) {
        const data = await sentRes.json();
        const list = Array.isArray(data?.messages) ? data.messages : [];
        setSentMessages(list);
      } else {
        setSentMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setReceivedMessages([]);
      setSentMessages([]);
      setUnreadCount(0);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/messages/recipients');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        const usersList = Array.isArray(data) ? data : [];
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
      setReceivedMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isRead: true } : msg)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRecipient || !messageContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a recipient and enter a message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('recipientId', selectedRecipient);
      formData.append('content', messageContent);
      if (subject.trim()) formData.append('subject', subject.trim());
      if (attachment) formData.append('attachment', attachment);

      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const created = (await response.json().catch(() => null)) as Message | null;
        toast({
          title: 'Success',
          description: 'Message sent successfully',
        });
        setIsComposeOpen(false);
        setSelectedRecipient('');
        setSubject('');
        setMessageContent('');
        setAttachment(null);
        if (created?.id) {
          setSentMessages((prev) => [created, ...prev]);
        } else {
          fetchMessages();
        }
        setActiveTab('sent');
      } else {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleReply = (senderId: string, senderName: string) => {
    setSelectedRecipient(senderId);
    setSubject('');
    setMessageContent('');
    setAttachment(null);
    setIsComposeOpen(true);
  };

  const handleComposeKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!sending && selectedRecipient && messageContent.trim()) handleSendMessage();
    }
  };

  const receivedList = receivedMessages;
  const sentList = sentMessages;

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
            <MessageSquare className="h-8 w-8" />
            Messages
          </h1>
          <p className="text-zinc-400 mt-1">
            Communicate with your {session?.user?.role === 'client' ? 'barbers and stylists' : 'clients'}
          </p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-black">
              <Send className="h-4 w-4" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] bg-zinc-950 text-white border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">New Message</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Send a message to {session?.user?.role === 'client' ? 'a barber or stylist' : 'a client'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-zinc-200">Recipient</Label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger
                    id="recipient"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 [&>span]:text-white [&>span[data-placeholder]]:text-zinc-500"
                  >
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="focus:bg-white/10 focus:text-white">
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-zinc-200">Subject (optional)</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Appointment details"
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 caret-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-zinc-200">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={handleComposeKeyDown}
                  rows={6}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 caret-white"
                />
                <p className="text-xs text-zinc-500">Tip: Cmd/Ctrl + Enter to send</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment" className="text-zinc-200">Attachment (optional)</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  className="bg-zinc-900 border-zinc-800 text-white file:text-zinc-200 file:bg-white/10 file:border-0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsComposeOpen(false)}
                className="border-zinc-800 bg-transparent text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !selectedRecipient || !messageContent.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 text-black disabled:bg-white/10 disabled:text-zinc-500"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'received' | 'sent')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800 text-white">
          <TabsTrigger value="received" className="relative">
            Received
            {unreadCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4 mt-6">
          {receivedList.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="text-center text-zinc-400 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages received yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            receivedList.map((message) => (
              <Card 
                key={message.id} 
                className={`cursor-pointer transition-colors bg-zinc-900 border-zinc-800 ${!message.isRead ? 'ring-1 ring-cyan-500/30' : ''}`}
                onClick={() => !message.isRead && markAsRead(message.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-white">{message.sender?.name || 'Unknown'}</span>
                        {!message.isRead && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-zinc-400">{message.sender?.email || ''}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-zinc-800 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReply(message.senderId, message.sender?.name || '');
                      }}
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-white">{message.content}</p>
                  <p className="text-xs text-zinc-500 mt-4">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentList.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="text-center text-zinc-400 py-8">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages sent yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            sentList.map((message) => (
              <Card key={message.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">To: {message.recipient?.name || 'Unknown'}</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Sent on {new Date(message.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-white">{message.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
