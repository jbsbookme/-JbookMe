import { NextRequest, NextResponse } from 'next/server'
import { formatTime12h } from '@/lib/time'
import { prisma } from '@/lib/db'

type ChatMessage = {
  role?: string
  content?: string
}

type Lang = 'en' | 'es'

function detectLang(text: string): Lang {
  const value = (text || '').trim()
  if (!value) return 'en'
  const lower = value.toLowerCase()

  // Quick Spanish signal words + characters.
  const spanishSignals = [
    'hola',
    'buenas',
    'buenos',
    'gracias',
    'por favor',
    'quiero',
    'necesito',
    'servicio',
    'servicios',
    'reserva',
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
  // One strong Spanish signal (e.g. "hola") should already be enough.
  return hasSpanishChar || hitCount >= 1 ? 'es' : 'en'
}

function serviceLabel(service: string | null, lang: Lang): string | null {
  if (!service) return null
  const key = service.toLowerCase()
  const map: Record<string, { en: string; es: string }> = {
    haircut: { en: 'Haircut', es: 'Corte' },
    beard: { en: 'Beard', es: 'Barba' },
    eyebrows: { en: 'Eyebrows', es: 'Cejas' },
    treatment: { en: 'Treatment', es: 'Tratamiento' },
    combo: { en: 'Combo', es: 'Combo' },
  }
  const item = map[key]
  return item ? item[lang] : service
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

function normalizeForMatch(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type CachedLookup<T> = {
  at: number
  value: T
}

type BarberLookup = { id: string; displayName: string; normalized: string }
type ServiceLookup = { id: string; name: string; normalized: string; barberId: string | null }

let cachedBarbers: CachedLookup<BarberLookup[]> | null = null
let cachedServices: CachedLookup<ServiceLookup[]> | null = null

async function getActiveBarberLookups(): Promise<BarberLookup[]> {
  const now = Date.now()
  const ttlMs = 5 * 60 * 1000
  if (cachedBarbers && now - cachedBarbers.at < ttlMs) return cachedBarbers.value

  try {
    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
      select: {
        id: true,
        user: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const list = barbers
      .map((b) => {
        const displayName = typeof b.user?.name === 'string' ? b.user.name.trim() : ''
        return {
          id: b.id,
          displayName,
          normalized: normalizeForMatch(displayName),
        }
      })
      .filter((b) => b.displayName && b.normalized.length > 0)

    cachedBarbers = { at: now, value: list }
    return list
  } catch {
    // DB might be unavailable in some environments; keep a safe fallback.
    const fallback = ['jose', 'miguel', 'carlos', 'sandra', 'maria', 'ana', 'juan', 'adolfo'].map((n) => ({
      id: n,
      displayName: n,
      normalized: normalizeForMatch(n),
    }))
    cachedBarbers = { at: now, value: fallback }
    return fallback
  }
}

async function getActiveServiceLookups(): Promise<ServiceLookup[]> {
  const now = Date.now()
  const ttlMs = 5 * 60 * 1000
  if (cachedServices && now - cachedServices.at < ttlMs) return cachedServices.value

  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, barberId: true },
      orderBy: { updatedAt: 'desc' },
    })

    const list = services
      .map((s) => {
        const name = typeof s.name === 'string' ? s.name.trim() : ''
        return {
          id: s.id,
          name,
          barberId: s.barberId ?? null,
          normalized: normalizeForMatch(name),
        }
      })
      .filter((s) => s.name && s.normalized.length > 0)
      // Prefer longer matches first (e.g., "haircut + beard" over "haircut")
      .sort((a, b) => b.normalized.length - a.normalized.length)

    cachedServices = { at: now, value: list }
    return list
  } catch {
    // Safe fallback: basic keywords.
    const fallbackNames = ['haircut', 'beard', 'eyebrows', 'treatment', 'combo', 'corte', 'barba', 'cejas', 'tratamiento', 'paquete']
    const list = fallbackNames.map((name) => ({ id: name, name, barberId: null, normalized: normalizeForMatch(name) }))
    cachedServices = { at: now, value: list }
    return list
  }
}

function findFirstIncluded(normalizedHaystack: string, normalizedNeedle: string): boolean {
  if (!normalizedNeedle) return false
  const padded = ` ${normalizedHaystack} `
  const needle = ` ${normalizedNeedle} `
  return padded.includes(needle)
}

// Helper function to extract appointment info from conversation
async function extractAppointmentInfo(messages: ChatMessage[]) {
  const conversationTextRaw = messages
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join(' ')

  const conversationText = conversationTextRaw.toLowerCase()
  const conversationNorm = normalizeForMatch(conversationTextRaw)
  
  // Extract barber name
  let barber = null
  let barberId: string | null = null
  const barberLookups = await getActiveBarberLookups()
  for (const b of barberLookups) {
    if (findFirstIncluded(conversationNorm, b.normalized)) {
      barber = b.displayName
      barberId = b.id
      break
    }
  }
  
  // Extract service
  let service = null
  let serviceId: string | null = null
  const serviceLookups = await getActiveServiceLookups()
  const findServiceMatch = (predicate: (s: ServiceLookup) => boolean) => {
    for (const s of serviceLookups) {
      if (!predicate(s)) continue
      if (findFirstIncluded(conversationNorm, s.normalized)) {
        service = s.name
        serviceId = s.id
        return true
      }
    }
    return false
  }

  // If barber is known, prefer services tied to that barber first.
  if (barberId) {
    findServiceMatch((s) => s.barberId === barberId)
  }
  if (!serviceId) {
    findServiceMatch(() => true)
  }

  // Fallback keyword mapping if service name matching didn't trigger.
  if (!service) {
    if (conversationText.includes('haircut') || conversationText.includes('corte')) service = 'haircut'
    else if (conversationText.includes('beard') || conversationText.includes('barba')) service = 'beard'
    else if (conversationText.includes('eyebrows') || conversationText.includes('cejas')) service = 'eyebrows'
    else if (conversationText.includes('treatment') || conversationText.includes('tratamiento')) service = 'treatment'
    else if (conversationText.includes('combo') || conversationText.includes('paquete')) service = 'combo'
  }

  // If we got a keyword service but no id, try to map it to a real active service.
  if (service && !serviceId) {
    const serviceNorm = normalizeForMatch(service)
    const preferred = barberId
      ? serviceLookups.find((s) => s.barberId === barberId && (s.normalized === serviceNorm || s.normalized.includes(serviceNorm)))
      : null
    const any = serviceLookups.find((s) => s.normalized === serviceNorm || s.normalized.includes(serviceNorm))
    const hit = preferred ?? any
    if (hit) {
      service = hit.name
      serviceId = hit.id
    }
  }
  
  // Extract date
  let date = null
  const datePatterns = [
    /\b(tomorrow)\b/i,
    /\b(today)\b/i,
    /\b(mañana)\b/i,
    /\b(hoy)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i,
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i,
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
      /\b(morning|afternoon|evening)\s+(early|mid|late)\b/i,
      /\b(\d{1,2})\s*(de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche)\b/i
  ]
  for (const pattern of timePatterns) {
    const match = conversationText.match(pattern)
    if (match) {
      time = match[0]
      break
    }
  }
  
  return { barber, barberId, service, serviceId, date, time }
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

    const bodyObj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null
    const requestedLocale =
      (typeof bodyObj?.locale === 'string' && bodyObj.locale) ||
      (typeof bodyObj?.language === 'string' && bodyObj.language) ||
      null

    // Get user message
    const userMessageRaw = (typedMessages[typedMessages.length - 1]?.content || '') as string
    const userMessage = userMessageRaw.toLowerCase() || ''
    const detected = detectLang(userMessageRaw)
    const requested: Lang | null = requestedLocale === 'es' || requestedLocale === 'en' ? requestedLocale : null
    // If the client sends a default locale that doesn't match the message, prefer the detected language.
    const lang: Lang = requested ? (requested === 'en' && detected === 'es' ? 'es' : requested) : detected
    
    // Extract appointment info from entire conversation
    const info = await extractAppointmentInfo(typedMessages)
    
    // Check if we're in an appointment conversation flow
    const isInAppointmentFlow = typedMessages.slice(-4).some((m) => {
      if (m.role !== 'assistant') return false
      if (typeof m.content !== 'string') return false
      const content = m.content.toLowerCase()
      return (
        content.includes('what service') ||
        content.includes('what day') ||
        content.includes('what time') ||
        content.includes("i can book you") ||
        content.includes('qué servicio') ||
        content.includes('que servicio') ||
        content.includes('qué día') ||
        content.includes('que dia') ||
        content.includes('qué hora') ||
        content.includes('que hora') ||
        content.includes('puedo reservarte')
      )
    })
    
    // Check if user wants to make an appointment
    const wantsAppointment =
      userMessage.match(/\b(book|schedule|make|need|want)\s+(an\s+)?(appointment)\b/i) ||
      userMessage.match(/\bappointment\s+with\b/i) ||
      userMessage.match(/\b(reserv(ar|a)|agendar|programar)\b/i) ||
      userMessage.match(/\b(cita|turno)\b/i) ||
      isInAppointmentFlow

    const bookingLink = info.barberId && info.serviceId ? `/reservar?barberId=${encodeURIComponent(info.barberId)}&serviceId=${encodeURIComponent(info.serviceId)}` : null
    const bookingMarker = bookingLink ? `\n\n[[BOOKING_LINK]]${bookingLink}` : ''
    
    if (wantsAppointment || isInAppointmentFlow) {
      // If we have barber + service IDs, send the user straight to booking.
      if (bookingLink) {
        const message =
          lang === 'es'
            ? `Listo. Te dejo la reserva lista para ${info.service}${info.barber ? ` con ${info.barber}` : ''}.${bookingMarker}`
            : `Done. Your booking is ready for ${info.service}${info.barber ? ` with ${info.barber}` : ''}.${bookingMarker}`
        if (!wantsStream(request)) {
          return NextResponse.json({ message, fallback: true })
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const encoder = new TextEncoder()
            for (const chunk of chunkText(message, 18)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`))
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

      // Otherwise ask for missing information step by step.
      if (!info.service) {
        const message =
          lang === 'es'
            ? `Perfecto. ${info.barber ? `Con ${info.barber}. ` : ''}¿Qué servicio quieres? (corte, barba, cejas, tratamiento o combo)`
            : `Perfect. ${info.barber ? `With ${info.barber}. ` : ''}What service do you want? (haircut, beard, eyebrows, treatment, or combo)`
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
        const svc = serviceLabel(info.service, lang) ?? info.service
        const message =
          lang === 'es'
            ? `Excelente — ${svc}${info.barber ? ` con ${info.barber}` : ''}. ¿Qué día lo quieres? (hoy, mañana, o una fecha)`
            : `Great — a ${svc}${info.barber ? ` with ${info.barber}` : ''}. What day would you like the appointment? You can say tomorrow, a day of the week, or a specific date.`
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
        const svc = serviceLabel(info.service, lang) ?? info.service
        const message =
          lang === 'es'
            ? `Perfecto. ${svc}${info.barber ? ` con ${info.barber}` : ''} el ${info.date}. ¿A qué hora? (9am–8pm lun–sáb, 10am–6pm dom)`
            : `Perfect! So ${svc}${info.barber ? ` with ${info.barber}` : ''} on ${info.date}. What time works best for you? Our hours are 9am–8pm Monday–Saturday, and 10am–6pm on Sundays.`
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
        const timeDisplay = formatTime12h(info.time)
        const svc = serviceLabel(info.service, lang) ?? info.service
        const message =
          lang === 'es'
            ? `Perfecto. Servicio: ${svc}${info.barber ? ` con ${info.barber}` : ''}. Día: ${info.date}. Hora: ${timeDisplay}.\n\nAbre “Reservar” para finalizar.`
            : `Perfect. Service: ${svc}${info.barber ? ` with ${info.barber}` : ''}. Date: ${info.date}. Time: ${timeDisplay}.\n\nOpen “Book” to finish.`
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
    if (userMessage.match(/^(hey|hi|hello|good\s+morning|good\s+afternoon|good\s+evening|greetings|how\s+are\s+you)/i) ||
        userMessage.match(/^(hola|buenas|buenos\s+d(i|í)as|buenas\s+tardes|buenas\s+noches|saludos|c(o|ó)mo\s+est(a|á)s)/i)) {
      response =
        lang === 'es'
          ? `¡Hola! Bienvenido a JBookMe Barbershop. Puedo ayudarte con servicios y precios, horarios, ubicación y reservar una cita. ¿Qué necesitas hoy?`
          : `Hi! Welcome to JBookMe Barbershop. I can help with services and prices, hours, location, and booking an appointment. What do you need today?`
    }
    
    // Services & Prices
    else if (
      userMessage.includes('service') ||
      userMessage.includes('price') ||
      userMessage.includes('cost') ||
      userMessage.includes('how much') ||
      userMessage.includes('rate') ||
      userMessage.includes('servicio') ||
      userMessage.includes('precio') ||
      userMessage.includes('costo') ||
      userMessage.includes('cuanto')
    ) {
      if (userMessage.includes('haircut') || userMessage.includes('hair') || userMessage.includes('corte')) {
        response =
          lang === 'es'
            ? `Claro. Cortes: Clásico $20, Moderno $25, Con diseño $30 y Premium $35. ¿Quieres que te ayude a reservar una cita?`
            : `Sure! Haircuts: Classic $20, Modern $25, Design $30, and Premium $35. Want me to help you book an appointment?`
      } else if (userMessage.includes('beard') || userMessage.includes('shave') || userMessage.includes('barba')) {
        response =
          lang === 'es'
            ? `¡Perfecto! Barba: Recorte $15, Perfilado $20 y Afeitado con toalla caliente $30. ¿Quieres reservar?`
            : `Absolutely! Beard: Trim $15, Shaping $20, and Hot Towel Shave $30. Want to book?`
      } else {
        response =
          lang === 'es'
            ? `Con gusto. Cortes $20–$35, barba $15–$30, cejas $10 y tratamientos $40–$50. También hay combos. ¿Qué servicio quieres?`
            : `Happy to help. Haircuts $20–$35, beard $15–$30, eyebrows $10, treatments $40–$50, and combos. Which service do you want?`
      }
    }
    
    // Schedule
    else if (
      userMessage.includes('hours') ||
      userMessage.includes('open') ||
      userMessage.includes('when') ||
      userMessage.includes('schedule') ||
      userMessage.includes('horario') ||
      userMessage.includes('abren') ||
      userMessage.includes('cierran') ||
      userMessage.includes('a que hora')
    ) {
      response =
        lang === 'es'
          ? `Nuestro horario es de lunes a sábado 9:00am–8:00pm y domingos 10:00am–6:00pm. ¿Quieres reservar una cita?`
          : `Our hours are Monday–Saturday 9:00am–8:00pm and Sundays 10:00am–6:00pm. Would you like to book an appointment?`
    }
    
    // Reservations - also check if part of appointment flow
    else if (
      (userMessage.includes('book') ||
        userMessage.includes('appointment') ||
        userMessage.includes('schedule') ||
        userMessage.includes('reserve') ||
        userMessage.includes('reserv') ||
        userMessage.includes('cita') ||
        userMessage.includes('turno')) &&
      !wantsAppointment
    ) {
      response =
        lang === 'es'
          ? `¡Claro! Para reservar dime: 1) con qué barbero, 2) qué servicio, y 3) qué día y hora prefieres. Si quieres, también puedes ir a "Book" y hacerlo ahí. ¿Cómo prefieres?`
          : `Sure! To book, tell me: 1) which barber, 2) what service, and 3) what day/time you prefer. You can also go to "Book" and do it there. Which do you prefer?`
    }
    
    // Location
    else if (
      userMessage.includes('location') ||
      userMessage.includes('address') ||
      userMessage.includes('where') ||
      userMessage.includes('directions') ||
      userMessage.includes('ubicacion') ||
      userMessage.includes('dirección') ||
      userMessage.includes('direccion') ||
      userMessage.includes('como llegar')
    ) {
      response =
        lang === 'es'
          ? `Para ver la ubicación exacta, ve al menú y toca "Ubicación". Ahí puedes abrir GPS/Directions. ¿Necesitas la dirección?`
          : `To see our exact location, go to the menu and tap "Location". You can open GPS directions from there. Need the address?`
    }
    
    // Payment
    else if (userMessage.includes('pay') || userMessage.includes('payment') || userMessage.includes('cash') || userMessage.includes('card')) {
      response =
        lang === 'es'
          ? `Aceptamos efectivo, tarjetas, PayPal, Zelle y transferencias. ¿Quieres reservar una cita?`
          : `We accept cash, cards, PayPal, Zelle, and bank transfers. Want to book an appointment?`
    }
    
    // Cancellation
    else if (
      userMessage.includes('cancel') ||
      userMessage.includes('cancellation') ||
      userMessage.includes('reschedule') ||
      userMessage.includes('modify') ||
      userMessage.includes('cancelar') ||
      userMessage.includes('reprogram') ||
      userMessage.includes('modificar')
    ) {
      response =
        lang === 'es'
          ? `Para cancelar o reprogramar: ve a tu perfil → “Mis Citas” → elige la cita y edítala. Si necesitas, dime cuál cita y te guío.`
          : `To cancel or reschedule: go to your profile → “My Appointments” → open the appointment and edit it. If you want, tell me which one and I’ll guide you.`
    }
    
    // Barbers
    else if (
      userMessage.includes('barber') ||
      userMessage.includes('stylist') ||
      userMessage.includes('who') ||
      userMessage.includes('professional') ||
      userMessage.includes('barbero') ||
      userMessage.includes('equipo')
    ) {
      response =
        lang === 'es'
          ? `Tenemos un equipo completo. En el menú entra a “Barberos / Our Team” para ver perfiles y reseñas. ¿Con quién quieres reservar?`
          : `We have a full team. In the menu, open “Our Team” to see profiles and reviews. Who do you want to book with?`
    }
    
    // Reviews
    else if (
      userMessage.includes('review') ||
      userMessage.includes('opinion') ||
      userMessage.includes('rating') ||
      userMessage.includes('feedback') ||
      userMessage.includes('rese')
    ) {
      response =
        lang === 'es'
          ? `Puedes ver reseñas y calificaciones en el menú en “Reseñas”. ¿Quieres reservar ahora?`
          : `You can see reviews and ratings in the menu under “Reviews”. Want to book now?`
    }
    
    // Gallery/Inspiration
    else if (
      userMessage.includes('gallery') ||
      userMessage.includes('photo') ||
      userMessage.includes('example') ||
      userMessage.includes('inspir') ||
      userMessage.includes('galer') ||
      userMessage.includes('foto')
    ) {
      response =
        lang === 'es'
          ? `Para inspiración, abre “Galería / Get Inspired” en el menú. ¿Buscas corte, barba o ambos?`
          : `For inspiration, open “Get Inspired / Gallery” in the menu. Are you looking for haircut, beard, or both?`
    }
    
    // Thanks
    else if (userMessage.match(/(thanks|thx|ty)/i)) {
      response = lang === 'es' ? `¡Con gusto! ¿Te ayudo con una reserva?` : `You're welcome! Anything else I can help with?`
    }
    
    // Goodbye
    else if (userMessage.match(/(bye|goodbye|see\s+you|later)/i)) {
      response = lang === 'es' ? `¡Nos vemos! Cuando quieras, te ayudo a reservar.` : `See you soon! Whenever you're ready, I can help you book.`
    }
    
    // Default response
    else {
      response =
        lang === 'es'
          ? `¡Claro! Puedo ayudarte a reservar una cita. Dime: barbero (opcional), servicio, día y hora. ¿Qué te gustaría reservar?`
          : `Got it. I can help you book an appointment. Tell me: barber (optional), service, day, and time. What would you like to book?`
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
