'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Facebook, Instagram, Twitter, Youtube, MessageCircle, Music2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

interface Settings {
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  whatsapp?: string
}

export default function SocialMediaManagement() {
  const router = useRouter()
  const { data: session, status } = useSession() || {}
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Settings>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth')
      return
    }

    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchSettings()
  }, [session, status, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          twitter: data.twitter || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
          whatsapp: data.whatsapp || ''
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error al cargar la configuración')
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Redes sociales actualizadas correctamente')
      } else {
        toast.error('Error al actualizar redes sociales')
      }
    } catch (error) {
      console.error('Error saving social media:', error)
      toast.error('Error al guardar cambios')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleRemove = (field: keyof Settings) => {
    setSettings(prev => ({ ...prev, [field]: '' }))
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-white">Cargando...</p>
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
              Gestión de <span className="text-[#00f0ff]">Redes Sociales</span>
            </h1>
            <p className="text-gray-400">Administra los enlaces de redes sociales de la barbería</p>
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Instrucciones</CardTitle>
            <CardDescription className="text-gray-400">
              Ingresa los enlaces completos de tus redes sociales. Ejemplo:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Facebook: https://facebook.com/tubarberia</li>
              <li>• Instagram: https://instagram.com/tubarberia</li>
              <li>• TikTok: https://tiktok.com/@tubarberia</li>
              <li>• WhatsApp: https://wa.me/15551234567</li>
            </ul>
          </CardContent>
        </Card>

        {/* Social Media Forms */}
        <div className="grid gap-6">
          {/* Facebook */}
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Facebook className="w-5 h-5 text-blue-500" />
                Facebook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="facebook" className="text-gray-300">URL de Facebook</Label>
                <Input
                  id="facebook"
                  type="url"
                  placeholder="https://facebook.com/tubarberia"
                  value={settings.facebook || ''}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              {settings.facebook && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove('facebook')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Instagram className="w-5 h-5 text-pink-500" />
                Instagram
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagram" className="text-gray-300">URL de Instagram</Label>
                <Input
                  id="instagram"
                  type="url"
                  placeholder="https://instagram.com/tubarberia"
                  value={settings.instagram || ''}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              {settings.instagram && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove('instagram')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Twitter */}
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Twitter className="w-5 h-5 text-blue-400" />
                Twitter / X
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitter" className="text-gray-300">URL de Twitter</Label>
                <Input
                  id="twitter"
                  type="url"
                  placeholder="https://twitter.com/tubarberia"
                  value={settings.twitter || ''}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              {settings.twitter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove('twitter')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* TikTok */}
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Music2 className="w-5 h-5 text-black bg-white rounded" />
                TikTok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tiktok" className="text-gray-300">URL de TikTok</Label>
                <Input
                  id="tiktok"
                  type="url"
                  placeholder="https://tiktok.com/@tubarberia"
                  value={settings.tiktok || ''}
                  onChange={(e) => handleChange('tiktok', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              {settings.tiktok && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove('tiktok')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* YouTube */}
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Youtube className="w-5 h-5 text-red-500" />
                YouTube
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="youtube" className="text-gray-300">URL de YouTube</Label>
                <Input
                  id="youtube"
                  type="url"
                  placeholder="https://youtube.com/@tubarberia"
                  value={settings.youtube || ''}
                  onChange={(e) => handleChange('youtube', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              {settings.youtube && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove('youtube')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5 text-green-500" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsapp" className="text-gray-300">URL de WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="url"
                  placeholder="https://wa.me/15551234567"
                  value={settings.whatsapp || ''}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white"
                />
              </div>
              {settings.whatsapp && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove('whatsapp')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90 px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
