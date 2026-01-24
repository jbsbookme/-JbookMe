'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone, Mail, Clock, Navigation, ArrowLeft, Facebook, Instagram, Twitter, Youtube, Music2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/i18n-context'
import { HistoryBackButton } from '@/components/layout/history-back-button'
import { normalizeExternalUrl, normalizeWhatsAppUrl } from '@/lib/utils'

interface Settings {
  shopName: string
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null

  facebook?: string | null
  instagram?: string | null
  twitter?: string | null
  tiktok?: string | null
  youtube?: string | null
  whatsapp?: string | null

  // Backward-compat (some older UI used *Url)
  facebookUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null
  tiktokUrl?: string | null
  youtubeUrl?: string | null
  whatsappUrl?: string | null
}

export default function UbicacionPage() {
  const { t } = useI18n()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const businessFacebook = settings?.facebookUrl || settings?.facebook || ''
  const businessInstagram = settings?.instagramUrl || settings?.instagram || ''
  const businessTwitter = settings?.twitterUrl || settings?.twitter || ''
  const businessTiktok = settings?.tiktokUrl || settings?.tiktok || ''
  const businessYoutube = settings?.youtubeUrl || settings?.youtube || ''
  const businessWhatsapp = settings?.whatsappUrl || settings?.whatsapp || ''

  const facebookHref = normalizeExternalUrl(businessFacebook) || ''
  const instagramHref = normalizeExternalUrl(businessInstagram) || ''
  const twitterHref = normalizeExternalUrl(businessTwitter) || ''
  const tiktokHref = normalizeExternalUrl(businessTiktok) || ''
  const youtubeHref = normalizeExternalUrl(businessYoutube) || ''
  const whatsappHref = normalizeWhatsAppUrl(businessWhatsapp, settings?.phone || undefined) || ''

  const telHref = settings?.phone
    ? `tel:${settings.phone.trim().replace(/[^\d+]/g, '')}`
    : ''
  const mailHref = settings?.email ? `mailto:${settings.email.trim()}` : ''
  const hasSocial = Boolean(
    businessFacebook || businessInstagram || businessTwitter || businessTiktok || businessYoutube || businessWhatsapp
  )

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const openInMaps = () => {
    if (settings?.latitude && settings?.longitude) {
      // Open in Google Maps with navigation
      const url = `https://www.google.com/maps/dir/?api=1&destination=${settings.latitude},${settings.longitude}`
      try {
        const w = window.open(url, '_blank', 'noopener,noreferrer')
        if (!w) window.location.href = url
      } catch {
        window.location.href = url
      }
    } else if (settings?.address) {
      // Fallback to address search
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
      try {
        const w = window.open(url, '_blank', 'noopener,noreferrer')
        if (!w) window.location.href = url
      } catch {
        window.location.href = url
      }
    } else {
      toast.error(t('location.locationNotAvailable'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center gap-4 mb-4">
            <HistoryBackButton
              fallbackHref="/menu"
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
            >
              <ArrowLeft className="w-5 h-5" />
            </HistoryBackButton>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-[#00f0ff] via-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent">
                  {t('location.title')}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-gray-400">{t('location.findEasily')}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map */}
          <Card className="bg-gray-900 border-gray-800 overflow-hidden rounded-2xl">
            <div className="relative aspect-video bg-gray-800">
              {settings?.latitude && settings?.longitude ? (
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${settings.latitude},${settings.longitude}&zoom=15`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <MapPin className="w-12 h-12" />
                </div>
              )}
            </div>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800 p-6 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">{t('location.contactInfo')}</h2>
              
              <div className="space-y-4">
                {settings?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{t('location.address')}</p>
                      <p className="text-white">{settings.address}</p>
                    </div>
                  </div>
                )}

                {settings?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{t('location.phone')}</p>
                      <a href={telHref} className="text-white hover:text-cyan-500">
                        {settings.phone}
                      </a>
                    </div>
                  </div>
                )}

                {settings?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{t('location.email')}</p>
                      <a href={mailHref} className="text-white hover:text-cyan-500">
                        {settings.email}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-cyan-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{t('location.hours')}</p>
                    <div className="text-white space-y-1">
                      <p>{t('location.mondaySaturday')}: 9:00 AM - 8:00 PM</p>
                      <p>{t('location.sundayHours')}: 10:00 AM - 6:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              {hasSocial && (
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-3">{t('common.followUs')}</p>
                  <div className="flex flex-wrap gap-3">
                    {businessFacebook ? (
                      <a
                        href={facebookHref}
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/30 transition-colors"
                      >
                        <Facebook className="w-5 h-5 text-blue-400" />
                      </a>
                    ) : null}

                    {businessInstagram ? (
                      <a
                        href={instagramHref}
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="w-11 h-11 rounded-full bg-pink-500/20 flex items-center justify-center hover:bg-pink-500/30 transition-colors"
                      >
                        <Instagram className="w-5 h-5 text-pink-400" />
                      </a>
                    ) : null}

                    {businessTwitter ? (
                      <a
                        href={twitterHref}
                        rel="noopener noreferrer"
                        aria-label="Twitter / X"
                        className="w-11 h-11 rounded-full bg-[#00f0ff]/20 flex items-center justify-center hover:bg-[#00f0ff]/30 transition-colors"
                      >
                        <Twitter className="w-5 h-5 text-[#00f0ff]" />
                      </a>
                    ) : null}

                    {businessTiktok ? (
                      <a
                        href={tiktokHref}
                        rel="noopener noreferrer"
                        aria-label="TikTok"
                        className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      >
                        <Music2 className="w-5 h-5 text-white" />
                      </a>
                    ) : null}

                    {businessYoutube ? (
                      <a
                        href={youtubeHref}
                        rel="noopener noreferrer"
                        aria-label="YouTube"
                        className="w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                      >
                        <Youtube className="w-5 h-5 text-red-400" />
                      </a>
                    ) : null}

                    {businessWhatsapp ? (
                      <a
                        href={whatsappHref}
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                        className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5 text-green-400" />
                      </a>
                    ) : null}
                  </div>
                </div>
              )}

              <Button
                onClick={openInMaps}
                className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              >
                <Navigation className="w-4 h-4 mr-2" />
                {t('location.directionGPS')}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
