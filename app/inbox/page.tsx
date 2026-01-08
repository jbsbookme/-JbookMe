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
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, Send, Reply } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: string;
  read: boolean;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

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
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
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
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Filter out current user and get only barbers/stylists for clients, or clients for barbers
        const filteredUsers = data.filter((user: User) => {
          if (user.id === session?.user?.id) return false;
          if (session?.user?.role === 'client') {
            return user.role === 'barber' || user.role === 'stylist';
          } else {
            return user.role === 'client';
          }
        });
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
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
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedRecipient,
          content: messageContent,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Message sent successfully',
        });
        setIsComposeOpen(false);
        setSelectedRecipient('');
        setMessageContent('');
        fetchMessages();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleReply = (senderId: string, senderName: string) => {
    setSelectedRecipient(senderId);
    setMessageContent('');
    setIsComposeOpen(true);
  };

  const sentMessages = messages.filter(msg => msg.senderId === session?.user?.id);
  const receivedMessages = messages.filter(msg => msg.receiverId === session?.user?.id);
  const unreadCount = receivedMessages.filter(msg => !msg.read).length;

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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Communicate with your {session?.user?.role === 'client' ? 'barbers and stylists' : 'clients'}
          </p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Send className="h-4 w-4" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Send a message to {session?.user?.role === 'client' ? 'a barber or stylist' : 'a client'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient</Label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger id="recipient">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
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
          {receivedMessages.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages received yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            receivedMessages.map((message) => (
              <Card 
                key={message.id} 
                className={`cursor-pointer transition-colors ${!message.read ? 'bg-accent/50' : ''}`}
                onClick={() => !message.read && markAsRead(message.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {message.senderName}
                        {!message.read && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{message.senderEmail}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReply(message.senderId, message.senderName);
                      }}
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentMessages.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages sent yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            sentMessages.map((message) => (
              <Card key={message.id}>
                <CardHeader>
                  <CardTitle className="text-lg">To: {message.receiverName}</CardTitle>
                  <CardDescription>
                    Sent on {new Date(message.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
