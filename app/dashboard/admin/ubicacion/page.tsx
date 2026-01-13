
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MapPin, Save, ArrowLeft, Navigation, Locate, Clock, MessageCircle, Phone } from 'lucide-react'
import { formatTime12h } from '@/lib/time'

interface Settings {
  id: string
  shopName: string
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  whatsappBusinessUrl: string | null
  businessHours: string | null
}

interface BusinessHours {
  [key: string]: {
    open: string
    close: string
    closed: boolean
  }
}

const defaultHours: BusinessHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '18:00', closed: false },
  sunday: { open: '10:00', close: '16:00', closed: false },
}

const dayNames: { [key: string]: string } = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export default function GestionUbicacionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultHours)

  const timeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = []
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      options.push({ value, label: formatTime12h(value) })
    }
    return options
  }, [])

  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    whatsappBusinessUrl: ''
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    if (status === 'authenticated') {
      fetchSettings()
    }
  }, [status, session, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          latitude: data.latitude?.toString() || '',
          longitude: data.longitude?.toString() || '',
          whatsappBusinessUrl: data.whatsappBusinessUrl || ''
        })
        
        // Parse business hours if exists
        if (data.businessHours) {
          try {
            const parsed = JSON.parse(data.businessHours)
            setBusinessHours(parsed)
          } catch (e) {
            console.error('Error parsing business hours:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error loading configuration');
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        shopName: settings?.shopName || 'My Barbershop',
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        whatsappBusinessUrl: formData.whatsappBusinessUrl || null,
        businessHours: JSON.stringify(businessHours)
      }

      console.log('Sending payload:', payload)

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Datos guardados:', data)
        toast.success('Location updated successfully');
        fetchSettings();
      } else {
        const error = await response.json();
        console.error('Error de API:', error);
        toast.error(error.error || 'Error updating location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Error updating location');
    } finally {
      setSaving(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support geolocation')
      return
    }

    setGettingLocation(true)
    toast.info('Getting your location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        setFormData({
          ...formData,
          latitude: lat,
          longitude: lng
        })
        toast.success('Location obtained successfully!')
        setGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        toast.error('Could not obtain location. Check browser permissions.')
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const generateWhatsAppUrl = () => {
    if (!formData.phone) {
      toast.error('First enter a phone number');
      return;
    }
    
    // Remove all non-numeric characters
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}`;
    
    setFormData({
      ...formData,
      whatsappBusinessUrl: url
    });
    
    toast.success('WhatsApp URL generated');
  }

  const updateBusinessHours = (day: string, field: string, value: string | boolean) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [field]: value
      }
    })
  }

  const openInMaps = () => {
    if (formData.latitude && formData.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${formData.latitude},${formData.longitude}`
      window.open(url, '_blank')
    } else if (formData.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address)}`
      window.open(url, '_blank')
    } else {
      toast.error('Enter an address or coordinates first');
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-cyan-400">Loading...</div>
      </div>
    )
  }

  if (!session || session.user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/admin')}
              className="text-gray-400 hover:text-cyan-400 hover:bg-transparent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Location and Contact Management</h1>
              <p className="text-gray-400">Configure your business information</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - Spans 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-500" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-white">Full Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="E.g.: 123 Main Street, City, State, ZIP 12345"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="info@mibarberia.com"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">GPS Coordinates</h3>
                        <p className="text-sm text-gray-400">To show your location on the map</p>
                      </div>
                      <Button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                        variant="outline"
                        size="sm"
                        className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <Locate className="w-4 h-4 mr-2" />
                        {gettingLocation ? 'Getting...' : 'Use my location'}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="latitude" className="text-white">Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="40.7128"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="longitude" className="text-white">Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="-74.0060"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-500" />
                          WhatsApp Business
                        </h3>
                        <p className="text-sm text-gray-400">Direct link for WhatsApp contact</p>
                      </div>
                      <Button
                        type="button"
                        onClick={generateWhatsAppUrl}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-400 hover:bg-green-500/10"
                      >
                        Generate from phone
                      </Button>
                    </div>
                    
                    <Input
                      value={formData.whatsappBusinessUrl}
                      onChange={(e) => setFormData({ ...formData, whatsappBusinessUrl: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="https://wa.me/1234567890"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: https://wa.me/YOURNUMBER (no spaces or symbols)
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-500" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dayNames).map(([key, name]) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <div className="w-28">
                        <span className="text-white font-medium">{name}</span>
                      </div>
                      
                      <Switch
                        checked={!businessHours[key].closed}
                        onCheckedChange={(checked) => updateBusinessHours(key, 'closed', !checked)}
                        className="data-[state=checked]:bg-cyan-500"
                      />
                      
                      {!businessHours[key].closed ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Select
                              value={businessHours[key].open}
                              onValueChange={(value) => updateBusinessHours(key, 'open', value)}
                            >
                              <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((opt) => (
                                  <SelectItem key={`open-${key}-${opt.value}`} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-gray-400">a</span>
                            <Select
                              value={businessHours[key].close}
                              onValueChange={(value) => updateBusinessHours(key, 'close', value)}
                            >
                              <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((opt) => (
                                  <SelectItem key={`close-${key}-${opt.value}`} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500 italic">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Save Button - Outside forms but triggers both */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-12"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openInMaps}
                className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 h-12"
              >
                <Navigation className="w-4 h-4 mr-2" />
                View on Map
              </Button>
            </div>
          </div>

          {/* Preview Map */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Map Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
                {formData.latitude && formData.longitude ? (
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${formData.latitude},${formData.longitude}&zoom=15`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MapPin className="w-12 h-12 mb-4" />
                    <p className="text-center text-sm">
                      Enter GPS coordinates<br />or use geolocation<br />to view the map
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                  Current Information
                </h4>
                
                {formData.address && (
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="text-sm text-white">{formData.address}</p>
                  </div>
                )}
                
                {formData.phone && (
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm text-white flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {formData.phone}
                    </p>
                  </div>
                )}
                
                {formData.email && (
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm text-white">{formData.email}</p>
                  </div>
                )}
                
                {formData.whatsappBusinessUrl && (
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-xs text-gray-400">WhatsApp Business</p>
                    <a 
                      href={formData.whatsappBusinessUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 hover:text-green-300 flex items-center gap-2"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Open chat
                    </a>
                  </div>
                )}
                
                {formData.latitude && formData.longitude && (
                  <div className="p-3 bg-gray-800 rounded">
                    <p className="text-xs text-gray-400">GPS Coordinates</p>
                    <p className="text-sm text-cyan-400 font-mono">
                      {formData.latitude}, {formData.longitude}
                    </p>
                  </div>
                )}

                {/* Current Business Hours */}
                <div className="p-3 bg-gray-800 rounded">
                  <p className="text-xs text-gray-400 mb-2">Current Schedule</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(dayNames).map(([key, name]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-400">{name}:</span>
                        <span className="text-white">
                          {businessHours[key].closed 
                            ? 'Closed' 
                            : `${formatTime12h(businessHours[key].open)} - ${formatTime12h(businessHours[key].close)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card className="bg-blue-900/20 border-blue-800">
            <CardContent className="p-4">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <Locate className="w-4 h-4" />
                Automatic Geolocation
              </h3>
              <p className="text-sm text-gray-400 mb-2">
                Use the &quot;Use my location&quot; button to automatically get GPS coordinates from your browser.
              </p>
              <p className="text-xs text-gray-500">
                ⚠️ Your browser will ask for permission to access your location.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-900/20 border-green-800">
            <CardContent className="p-4">
              <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp Business
              </h3>
              <p className="text-sm text-gray-400 mb-2">
                Customers can contact you directly via WhatsApp with one click.
              </p>
              <p className="text-xs text-gray-500">
                💡 The &quot;Generate from phone&quot; button creates the link automatically.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-cyan-900/20 border-cyan-800">
          <CardContent className="p-4">
            <h3 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              How to get coordinates manually
            </h3>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Maps</a></li>
              <li>Search for your exact address</li>
              <li>Right-click on the red marker at your location</li>
              <li>Select the first option (coordinates will appear)</li>
              <li>The coordinates will be automatically copied</li>
              <li>Paste them into the Latitude and Longitude fields</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
