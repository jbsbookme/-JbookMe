'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Send, Bot, Trash2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'jbookme-admin-chat-history'

const quickSuggestions = [
  'How many appointments do we have today?',
  'Show monthly statistics',
  'What are the most popular services?',
  'Help me with configuration'
]

export default function AdminAssistant() {
  const assistantEnabled = process.env.NEXT_PUBLIC_ASSISTANT_ENABLED === 'true'
  if (!assistantEnabled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Asistente desactivado</h1>
          <p className="text-sm text-gray-400">
            El asistente está temporalmente desactivado. Más adelante lo activamos de nuevo.
          </p>
          <Link href="/dashboard/admin">
            <Button className="bg-[#00f0ff] text-black hover:bg-[#00d0df]">Volver</Button>
          </Link>
        </div>
      </div>
    )
  }

  const router = useRouter()
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load chat history from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error loading chat history:', e)
        }
      }
    }
    return [
      {
        role: 'assistant',
        content: 'Hello! I\'m the JBookMe virtual assistant for administrators. How can I help you today?'
      }
    ]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth')
      return
    }

    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || 'Sorry, I could not process your message.'
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.'
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again later.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    const initialMessage = {
      role: 'assistant' as const,
      content: 'Hello! I\'m the JBookMe virtual assistant for administrators. How can I help you today?'
    }
    setMessages([initialMessage]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    toast.success('Conversation restarted');
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Virtual <span className="text-[#00f0ff]">Assistant</span>
            </h1>
            <p className="text-gray-400">AI chat specialized in barbershop</p>
          </div>
        </div>

        {/* Chat Card */}
        <Card className="bg-[#1a1a1a] border-gray-800 h-[600px] flex flex-col">
          <CardHeader className="border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bot className="w-6 h-6 text-[#00f0ff]" />
                  Chat with Assistant
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Ask questions about services, schedules, bookings and more
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                title="Clear conversation"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black'
                          : 'bg-[#0a0a0a] text-white border border-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#0a0a0a] text-white border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#00f0ff] rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-[#00f0ff] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-[#00f0ff] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <p className="text-sm text-gray-400">Quick suggestions:</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="text-left text-sm p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700 hover:border-cyan-500"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Write your message here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="bg-[#0a0a0a] border-gray-700 text-white flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
