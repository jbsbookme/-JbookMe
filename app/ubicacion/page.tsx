'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone, Mail, Clock, Navigation, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/i18n-context'
import { HistoryBackButton } from '@/components/layout/history-back-button'

interface Settings {
  shopName: string
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
}

export default function UbicacionPage() {
  const { t } = useI18n()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

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
      window.open(url, '_blank')
    } else if (settings?.address) {
      // Fallback to address search
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
      window.open(url, '_blank')
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
                      <a href={`tel:${settings.phone}`} className="text-white hover:text-cyan-500">
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
                      <a href={`mailto:${settings.email}`} className="text-white hover:text-cyan-500">
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
