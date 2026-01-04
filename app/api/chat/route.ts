import { NextRequest, NextResponse } from 'next/server'

type ChatMessage = {
  role?: string
  content?: string
}

function chunkText(text: string, chunkSize = 24): string[] {
  if (!text) return []
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

function wantsStream(request: NextRequest): boolean {
  const accept = request.headers.get('accept') || ''
  const xStream = request.headers.get('x-stream') || request.headers.get('x-use-stream')
  const url = new URL(request.url)
  return (
    accept.includes('text/event-stream') ||
    xStream === '1' ||
    xStream === 'true' ||
    url.searchParams.get('stream') === '1'
  )
}

// Helper function to extract appointment info from conversation
function extractAppointmentInfo(messages: ChatMessage[]) {
  const conversationText = messages
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join(' ')
    .toLowerCase()
  
  // Extract barber name
  let barber = null
  const barberMatches = conversationText.match(/\b(jose|miguel|carlos|sandra|maria|ana|juan)\b/i)
  if (barberMatches) {
    barber = barberMatches[1]
  }
  
  // Extract service
  let service = null
  if (conversationText.includes('haircut')) service = 'haircut'
  else if (conversationText.includes('beard')) service = 'beard'
  else if (conversationText.includes('eyebrows')) service = 'eyebrows'
  else if (conversationText.includes('treatment')) service = 'treatment'
  else if (conversationText.includes('combo')) service = 'combo'
  
  // Extract date
  let date = null
  const datePatterns = [
    /\b(tomorrow)\b/i,
    /\b(today)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b(\d{1,2})[\/\-](\d{1,2})\b/
  ]
  for (const pattern of datePatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      date = match[0]
      break
    }
  }
  
  // Extract time
  let time = null
  const timePatterns = [
    /\b(\d{1,2})\s*(?::|\.)\s*(\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)?\b/i,
    /\b(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/i,
    /\b(morning|afternoon|evening)\s+(early|mid|late)\b/i
  ]
  for (const pattern of timePatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      time = match[0]
      break
    }
  }
  
  return { barber, service, date, time }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const messages =
      typeof body === 'object' && body !== null && 'messages' in body
        ? (body as { messages?: unknown }).messages
        : undefined

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const typedMessages: ChatMessage[] = messages as ChatMessage[]

    // Get user message
    const userMessage = typedMessages[typedMessages.length - 1]?.content?.toLowerCase() || ''
    
    // Extract appointment info from entire conversation
    const info = extractAppointmentInfo(typedMessages)
    
    // Check if we're in an appointment conversation flow
    const isInAppointmentFlow = typedMessages.slice(-4).some((m) => {
      if (m.role !== 'assistant') return false
      if (typeof m.content !== 'string') return false
      const content = m.content.toLowerCase()
      return (
        content.includes('what service') ||
        content.includes('what day') ||
        content.includes('what time') ||
        content.includes("i can book you")
      )
    })
    
    // Check if user wants to make an appointment
    const wantsAppointment = userMessage.match(/\b(book|schedule|make|need|want)\s+(an\s+)?(appointment)\b/i) ||
                userMessage.match(/\bappointment\s+with\b/i) ||
                            isInAppointmentFlow
    
    if (wantsAppointment || isInAppointmentFlow) {
      // Ask for missing information step by step
      if (!info.service) {
        const message = `Perfect! ${info.barber ? `I can book you with ${info.barber}. ` : ''}What service would you like? We offer haircuts, beard services, eyebrows, hair treatments, and special combos. Which one do you prefer?`
        if (!wantsStream(request)) {
          return NextResponse.json({ message, fallback: true })
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      }
      
      if (!info.date) {
        const message = `Great — a ${info.service}${info.barber ? ` with ${info.barber}` : ''}. What day would you like the appointment? You can say tomorrow, a day of the week, or a specific date.`
        if (!wantsStream(request)) {
          return NextResponse.json({ message, fallback: true })
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      }
      
      if (!info.time) {
        const message = `Perfect! So ${info.service}${info.barber ? ` with ${info.barber}` : ''} on ${info.date}. What time works best for you? Our hours are 9am–8pm Monday–Saturday, and 10am–6pm on Sundays.`
        if (!wantsStream(request)) {
          return NextResponse.json({ message, fallback: true })
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      }
      
      // All info collected - confirm
      if (info.service && info.date && info.time) {
        const message = `Awesome! Let me confirm your appointment:

      📅 Service: ${info.service}
      ${info.barber ? `👨‍🦲 With: ${info.barber}\n` : ''}📆 Date: ${info.date}
      🕒 Time: ${info.time}

      To confirm this appointment, go to the main menu and tap "Book Now" where you can select these details and receive your confirmation. Would you like help with anything else?`
        if (!wantsStream(request)) {
          return NextResponse.json({ message, fallback: true })
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const encoder = new TextEncoder()
            for (const chunk of chunkText(message, 18)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`)
              )
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      }
    }
    
    // Smart response system
    let response = ''
    
    // Greetings
    if (userMessage.match(/^(hey|hi|hello|good\s+morning|good\s+afternoon|good\s+evening|greetings|how\s+are\s+you)/i)) {
      response = `Hi! I'm JBookMe's virtual assistant. I can help you with service info, hours, pricing, location, or booking an appointment. What can I help you with today?`
    }
    
    // Services & Prices
    else if (userMessage.includes('service') || userMessage.includes('price') || userMessage.includes('cost') || userMessage.includes('how much') || userMessage.includes('rate')) {
      if (userMessage.includes('haircut') || userMessage.includes('hair')) {
        response = `Sure! Here are our haircut options: Classic Cut $20, Modern Cut $25, Design Cut $30, and Premium Cut $35. Each includes wash and professional finish. Would you like to book an appointment?`
      } else if (userMessage.includes('beard') || userMessage.includes('shave')) {
        response = `Absolutely! For beard services: Beard Trim $15, Beard Shaping $20, and Classic Hot Towel Shave $30. We also offer Beard + Mustache for $25. Want me to help you book?`
      } else {
        response = `Happy to help. Haircuts range from $20 to $35, beard services from $15 to $30, eyebrow design is $10, and hair treatments are $40 to $50. We also have combos like Haircut + Beard for $40, and Full Service for $65. Which service would you like details on?`
      }
    }
    
    // Schedule
    else if (userMessage.includes('hours') || userMessage.includes('open') || userMessage.includes('when') || userMessage.includes('schedule')) {
      response = `Our hours are Monday–Saturday 9:00am–8:00pm, and Sundays 10:00am–6:00pm. You can also book online anytime, 24/7. Would you like to book now?`
    }
    
    // Reservations - also check if part of appointment flow
    else if ((userMessage.includes('book') || userMessage.includes('appointment') || userMessage.includes('schedule') || userMessage.includes('reserve')) && !wantsAppointment) {
      response = `Sure! I can help you book right now. Tell me who you'd like the appointment with, what service you need, and what day/time you prefer. Or you can go to the main menu and tap Book Now. Which do you prefer?`
    }
    
    // Location
    else if (userMessage.includes('location') || userMessage.includes('address') || userMessage.includes('where') || userMessage.includes('directions')) {
      response = `To see exactly where we are, go to the main menu and tap Location. You'll find our full address and an interactive map. You can also open it in Google Maps or get directions from your current location. Anything else you need?`
    }
    
    // Payment
    else if (userMessage.includes('pay') || userMessage.includes('payment') || userMessage.includes('cash') || userMessage.includes('card')) {
      response = `We accept multiple payment methods: cash, credit/debit cards, PayPal, Zelle, and bank transfers. Want to book an appointment?`
    }
    
    // Cancellation
    else if (userMessage.includes('cancel') || userMessage.includes('cancellation') || userMessage.includes('reschedule') || userMessage.includes('modify')) {
      response = `Here’s our cancellation policy: if you cancel at least 2 hours before your appointment, there’s no charge. If it’s less than 2 hours, a fee may apply. Rescheduling is always free. To cancel or reschedule, go to your profile, open My Appointments, select the appointment, and make the change. Need help with anything else?`
    }
    
    // Barbers
    else if (userMessage.includes('barber') || userMessage.includes('stylist') || userMessage.includes('who') || userMessage.includes('professional')) {
      response = `We have an amazing team of professional barbers and stylists. They do everything from classic and modern cuts to beard work, coloring, and hair treatments. If you go to the menu and tap Our Team, you can see each profile, specialties, and client reviews. Want to book with someone specific?`
    }
    
    // Reviews
    else if (userMessage.includes('review') || userMessage.includes('opinion') || userMessage.includes('rating') || userMessage.includes('feedback')) {
      response = `Great question! You can see real client reviews, service ratings, and recent experiences in the menu under Client Reviews. After your appointment, you can leave your own review too. Would you like to book an appointment?`
    }
    
    // Gallery/Inspiration
    else if (userMessage.includes('gallery') || userMessage.includes('photo') || userMessage.includes('example') || userMessage.includes('inspir')) {
      response = `If you're looking for inspiration for your next look, we have a full gallery. Go to the menu and tap Get Inspired to browse styles. Want to take a look?`
    }
    
    // Thanks
    else if (userMessage.match(/(thanks|thx|ty)/i)) {
      response = `You're welcome! If you need anything else, just tell me. Anything else I can help with?`
    }
    
    // Goodbye
    else if (userMessage.match(/(bye|goodbye|see\s+you|later)/i)) {
      response = `See you soon! Have a great day. Remember you can book an appointment anytime, 24/7.`
    }
    
    // Default response
    else {
      response = `I want to make sure I understand. I can help with services and prices, hours, booking an appointment, location, payment methods, meeting our team, or browsing the style gallery. What would you like to talk about?`
    }
    
    if (!wantsStream(request)) {
      return NextResponse.json({
        message: response,
        fallback: true,
      })
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        for (const chunk of chunkText(response, 18)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`)
          )
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
    
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
