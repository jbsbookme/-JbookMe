'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, ArrowLeft, Mic, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/i18n-context'
import { HistoryBackButton } from '@/components/layout/history-back-button'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type SpeechRecognitionResultEvent = {
  results: Array<Array<{ transcript: string }>>
}

type SpeechRecognitionErrorEvent = {
  error?: string
}

export default function AsistentePage() {
  const { t, language } = useI18n()
  const tRef = useRef(t)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const lastInputWasVoiceRef = useRef(false)
  const shouldSpeakResponseRef = useRef(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('assistant.greeting')
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)

  const detectPreferredLocale = (text: string): 'es' | 'en' => {
    const value = (text || '').trim()
    if (!value) return language === 'es' ? 'es' : 'en'
    const lower = value.toLowerCase()
    const spanishSignals = [
      'hola',
      'buenas',
      'buenos',
      'gracias',
      'por favor',
      'quiero',
      'necesito',
      'reserv',
      'cita',
      'turno',
      'barberia',
      'barbero',
      'peluquer',
      'corte',
      'barba',
      'horario',
      'precio',
      'direccion',
      'ubicacion',
      'mañana',
      'hoy',
      'lunes',
      'martes',
      'miércoles',
      'miercoles',
      'jueves',
      'viernes',
      'sábado',
      'sabado',
      'domingo',
    ]
    const hasSpanishChar = /[ñáéíóúü¿¡]/i.test(value)
    const hitCount = spanishSignals.reduce((acc, s) => (lower.includes(s) ? acc + 1 : acc), 0)

    if (hasSpanishChar || hitCount >= 2) return 'es'
    return language === 'es' ? 'es' : 'en'
  }

  const getPreferredRecognitionLocale = (): 'es-ES' | 'en-US' => {
    if (language === 'es') return 'es-ES'
    // If the app language is still EN but the device is Spanish, default mic to ES.
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) return 'es-ES'
    return 'en-US'
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    tRef.current = t
  }, [t])

  // Keep layout within the visible viewport when the mobile keyboard opens.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const vv = window.visualViewport

    const update = () => {
      const nextHeight = vv?.height ?? window.innerHeight
      // Guard against transient 0 values during rotations.
      if (nextHeight && nextHeight > 0) {
        setViewportHeight(nextHeight)
      }
    }

    update()

    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize speech synthesis
      synthesisRef.current = window.speechSynthesis

      // Load voices (needed for some browsers)
      const loadVoices = () => {
        if (synthesisRef.current) {
          synthesisRef.current.getVoices()
        }
      }
      
      // Chrome needs this event listener
      if (synthesisRef.current) {
        synthesisRef.current.addEventListener('voiceschanged', loadVoices)
        loadVoices() // Try loading immediately too
      }

      // Initialize speech recognition
      const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionCtor
        webkitSpeechRecognition?: SpeechRecognitionCtor
      }

      const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition

      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor()
        recognition.lang = getPreferredRecognitionLocale()
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onresult = (event: Event) => {
          const e = event as unknown as SpeechRecognitionResultEvent
          const transcript = e.results?.[0]?.[0]?.transcript
          if (!transcript) return
          lastInputWasVoiceRef.current = true
          setInput(transcript)
          setIsListening(false)
          toast.success(tRef.current('assistant.capturedMessage'))
        }

        recognition.onerror = (event: Event) => {
          const e = event as unknown as SpeechRecognitionErrorEvent
          console.error('Speech recognition error:', e.error)
          setIsListening(false)
          toast.error(tRef.current('assistant.errorCapturing'))
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      // Cleanup
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
    }
  }, [])

  // Keep recognition language in sync when user changes language.
  useEffect(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.lang = getPreferredRecognitionLocale()
  }, [language])

  const startListening = async () => {
    if (!recognitionRef.current) {
      toast.error(t('assistant.voiceNotAvailable'))
      return
    }

    try {
      // Force the browser to request microphone permission (improves reliability on iOS/Chrome).
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        toast.error(language === 'es' ? 'El micrófono requiere HTTPS.' : 'Microphone requires HTTPS.')
        return
      }

      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
      }

      setIsListening(true)
      recognitionRef.current.start()
      toast.info(t('assistant.startListening'))
    } catch (error) {
      console.error('Error starting recognition:', error)
      setIsListening(false)
      toast.error(language === 'es' ? 'No se pudo iniciar el micrófono. Revisa permisos.' : 'Could not start microphone. Check permissions.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speak = (text: string) => {
    if (!synthesisRef.current) {
      console.error('Speech synthesis not available')
      return
    }

    // Cancel any ongoing speech
    synthesisRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'es' ? 'es-ES' : 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to select a matching voice
    const voices = synthesisRef.current.getVoices()
    const preferredVoice =
      language === 'es'
        ? voices.find((voice) => voice.lang.toLowerCase().startsWith('es') || voice.lang.includes('Spanish'))
        : voices.find((voice) => voice.lang.toLowerCase().startsWith('en') || voice.lang.includes('English'))
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsSpeaking(false)
    }

    synthesisRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const preferredLocale = detectPreferredLocale(input)

    // Speak back when user used voice input OR user explicitly enabled autoSpeak.
    shouldSpeakResponseRef.current = lastInputWasVoiceRef.current || autoSpeak
    lastInputWasVoiceRef.current = false

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'X-Stream': '1'
        },
        body: JSON.stringify({
          locale: preferredLocale,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let assistantMessage = ''
      let buffer = ''

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // If we still have content in buffer, try to process it
            if (buffer.trim()) {
              assistantMessage += buffer
              setMessages(prev => {
                const newMessages = [...prev]
                if (newMessages.length > 0) {
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage || t('assistant.errorSendingMessage')
                  }
                }
                return newMessages
              })
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue
            
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  assistantMessage += content
                  // Update the last message (assistant's response)
                  setMessages(prev => {
                    const newMessages = [...prev]
                    if (newMessages.length > 0) {
                      newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: assistantMessage
                      }
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, 'Line:', trimmedLine)
              }
            }
          }
        }
        
        // Final check - if no content was received, show error
        if (!assistantMessage.trim()) {
          setMessages(prev => {
            const newMessages = [...prev]
            if (newMessages.length > 0 && !newMessages[newMessages.length - 1].content) {
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: t('assistant.errorSendingMessage') + ' Please try again.'
              }
            }
            return newMessages
          })
        } else if (shouldSpeakResponseRef.current) {
          // Auto-speak the assistant's response
          speak(assistantMessage)
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError)
        throw streamError
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: t('assistant.errorSendingMessage')
        }
      ])
    } finally {
      setIsLoading(false)
      shouldSpeakResponseRef.current = false
    }
  }

  const BOOKING_MARKER = '[[BOOKING_LINK]]'
  const renderAssistantContent = (content: string) => {
    if (!content.includes(BOOKING_MARKER)) {
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
    }

    const [textPart, linkPartRaw] = content.split(BOOKING_MARKER)
    const bookingHref = (linkPartRaw || '').trim().split(/\s+/)[0]

    return (
      <div className="space-y-3">
        {textPart?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{textPart.trim()}</p>
        ) : null}
        {bookingHref ? (
          <Link href={bookingHref} className="block">
            <Button className="w-full bg-[#00f0ff] text-black hover:bg-[#00d0df]">
              {language === 'es' ? 'Reservar ahora' : 'Book now'}
            </Button>
          </Link>
        ) : null}
      </div>
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="bg-black flex flex-col overflow-hidden"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HistoryBackButton
                fallbackHref="/menu"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </HistoryBackButton>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-cyan-500 flex items-center justify-center">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{t('assistant.title')}</h1>
                <p className="text-sm text-gray-400 mt-1">
                  {isSpeaking ? t('assistant.speaking') : t('assistant.subtitle')}
                </p>
              </div>
            </div>

            {/* Voice controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`${
                  autoSpeak
                    ? 'text-[#00f0ff] hover:text-[#00d0df]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title={autoSpeak ? t('assistant.disableVoiceResponse') : t('assistant.enableVoiceResponse')}
              >
                {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>

              {isSpeaking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopSpeaking}
                  className="text-red-400 hover:text-red-500"
                >
                  {t('assistant.stop')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-3">
        <Card className="bg-gray-900 border-gray-800 flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 min-h-0">
            <div className="min-h-full p-4 pt-8 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8 bg-cyan-500 flex-shrink-0">
                      <AvatarFallback className="bg-cyan-500">
                        <Bot className="w-5 h-5 text-black" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    {message.role === 'assistant' ? renderAssistantContent(message.content) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8 bg-gray-700 flex-shrink-0">
                      <AvatarFallback className="bg-gray-700">
                        <User className="w-5 h-5 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 bg-cyan-500 flex-shrink-0">
                    <AvatarFallback className="bg-cyan-500">
                      <Bot className="w-5 h-5 text-black" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Composer (anchored at bottom) */}
      <div className="border-t border-gray-800 bg-black/90 backdrop-blur-sm">
        <div
          className="mx-auto max-w-4xl px-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingTop: '12px' }}
        >
          <div className="bg-gray-900/95 backdrop-blur border border-gray-800 rounded-2xl p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => {
                  lastInputWasVoiceRef.current = false
                  setInput(e.target.value)
                }}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? t('assistant.listening') : t('assistant.typePlaceholder')}
                disabled={isLoading || isListening}
                className="flex-1 h-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
              />

              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                variant="outline"
                className={`${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 border-red-500 animate-pulse'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                }`}
                title={isListening ? 'Stop recording' : 'Speak'}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-[#00f0ff]'}`} />
              </Button>

              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-cyan-500 hover:bg-cyan-600 text-black h-9"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
