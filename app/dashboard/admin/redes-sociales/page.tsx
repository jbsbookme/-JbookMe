'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Facebook, Instagram, Twitter, Youtube, MessageCircle, Music2, Save, ExternalLink, CheckCircle2, XCircle, Eye, Link2, Copy, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { DashboardNavbar } from '@/components/dashboard/navbar'

interface Settings {
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  whatsapp?: string
}

interface SocialNetwork {
  key: keyof Settings
  name: string
  icon: LucideIcon
  color: string
  gradient: string
  placeholder: string
  example: string
  validateUrl: (url: string) => boolean
}

interface SocialMediaStats {
  totalClicks: number
  clicksByNetwork: Array<{ network: string; count: number }>
  uniqueUsers: number
  totalUsers: number
  engagementPercentage: number
  recentClicks: number
  mostPopularNetwork: { network: string; count: number } | null
}

export default function SocialMediaManagement() {
  const router = useRouter()
  const { data: session, status } = useSession() || {}
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Settings>({})
  const [validations, setValidations] = useState<Record<string, boolean>>({})
  const [copiedLink, setCopiedLink] = useState<string>('')
  const [stats, setStats] = useState<SocialMediaStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const socialNetworks: SocialNetwork[] = useMemo(() => [
    {
      key: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-500',
      gradient: 'from-blue-600 to-blue-400',
      placeholder: 'https://facebook.com/tubarberia',
      example: 'facebook.com/jbookme',
      validateUrl: (url) => url.includes('facebook.com') || url.includes('fb.com')
    },
    {
      key: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-500',
      gradient: 'from-pink-600 via-purple-600 to-orange-500',
      placeholder: 'https://instagram.com/tubarberia',
      example: 'instagram.com/jbookme',
      validateUrl: (url) => url.includes('instagram.com')
    },
    {
      key: 'twitter',
      name: 'Twitter / X',
      icon: Twitter,
      color: 'text-blue-400',
      gradient: 'from-blue-500 to-blue-300',
      placeholder: 'https://twitter.com/tubarberia',
      example: 'twitter.com/jbookme',
      validateUrl: (url) => url.includes('twitter.com') || url.includes('x.com')
    },
    {
      key: 'tiktok',
      name: 'TikTok',
      icon: Music2,
      color: 'text-white',
      gradient: 'from-black via-gray-800 to-gray-900',
      placeholder: 'https://tiktok.com/@tubarberia',
      example: 'tiktok.com/@jbookme',
      validateUrl: (url) => url.includes('tiktok.com')
    },
    {
      key: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      color: 'text-red-500',
      gradient: 'from-red-600 to-red-400',
      placeholder: 'https://youtube.com/@tubarberia',
      example: 'youtube.com/@jbookme',
      validateUrl: (url) => url.includes('youtube.com') || url.includes('youtu.be')
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-500',
      gradient: 'from-green-600 to-green-400',
      placeholder: 'https://wa.me/15551234567',
      example: 'wa.me/15551234567',
      validateUrl: (url) => url.includes('wa.me') || url.includes('whatsapp.com')
    }
  ], [])

  const validateAllUrls = useCallback((currentSettings: Settings) => {
    const newValidations: Record<string, boolean> = {}
    socialNetworks.forEach(network => {
      const url = currentSettings[network.key]
      if (url && url.trim()) {
        newValidations[network.key] = network.validateUrl(url)
      }
    })
    setValidations(newValidations)
  }, [socialNetworks])

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        const newSettings = {
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          twitter: data.twitter || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
          whatsapp: data.whatsapp || ''
        }
        setSettings(newSettings)
        validateAllUrls(newSettings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error loading configuration')
    }
  }, [validateAllUrls])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/social-media-clicks/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

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
    fetchStats()
  }, [fetchSettings, fetchStats, router, session, status])

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('✅ Social media updated successfully')
        fetchSettings()
      } else {
        toast.error('Error updating social media')
      }
    } catch (error) {
      console.error('Error saving social media:', error)
      toast.error('Error saving changes')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof Settings, value: string) => {
    const newSettings = { ...settings, [field]: value }
    setSettings(newSettings)
    
    // Validate URL
    const network = socialNetworks.find(n => n.key === field)
    if (network && value.trim()) {
      setValidations(prev => ({ ...prev, [field]: network.validateUrl(value) }))
    } else {
      setValidations(prev => {
        const newValidations = { ...prev }
        delete newValidations[field]
        return newValidations
      })
    }
  }

  const handleRemove = (field: keyof Settings) => {
    setSettings(prev => ({ ...prev, [field]: '' }))
    setValidations(prev => {
      const newValidations = { ...prev }
      delete newValidations[field]
      return newValidations
    })
    toast.success('Enlace eliminado')
  }

  const handleOpenLink = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank')
      toast.success('Abriendo enlace...')
    }
  }

  const handleCopyLink = (url: string, name: string) => {
    navigator.clipboard.writeText(url)
    setCopiedLink(name)
    toast.success(`Enlace de ${name} copiado`)
    setTimeout(() => setCopiedLink(''), 2000)
  }

  const getActiveCount = () => {
    return Object.values(settings).filter(url => url && url.trim()).length
  }

  const getValidCount = () => {
    return Object.values(validations).filter(valid => valid).length
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/admin">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="text-white">Social </span>
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                  Media
                </span>
              </h1>
              <p className="text-gray-400">Manage your barbershop&apos;s social media links</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Configured Networks</p>
                  <p className="text-3xl font-bold text-blue-400">{getActiveCount()}</p>
                  <p className="text-xs text-gray-500 mt-1">of {socialNetworks.length} available</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Link2 className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Valid URLs</p>
                  <p className="text-3xl font-bold text-green-400">{getValidCount()}</p>
                  <p className="text-xs text-gray-500 mt-1">verified links</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Clicks</p>
                  {loadingStats ? (
                    <div className="h-9 w-16 bg-purple-500/20 animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-purple-400">{stats?.totalClicks || 0}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">across all networks</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Eye className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">% Clients Engaged</p>
                  {loadingStats ? (
                    <div className="h-9 w-20 bg-yellow-500/20 animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-yellow-400">{stats?.engagementPercentage || 0}%</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{stats?.uniqueUsers || 0} de {stats?.totalUsers || 0} clientes</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <CheckCircle2 className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clicks por Red Social */}
        {!loadingStats && stats && stats.clicksByNetwork.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#00f0ff]" />
                Engagement Statistics
              </CardTitle>
              <CardDescription className="text-gray-400">
                Last 30 days: {stats.recentClicks} clicks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.clicksByNetwork.map((item) => {
                  const network = socialNetworks.find(n => n.key === item.network)
                  if (!network) return null
                  
                  const percentage = stats.totalClicks > 0 
                    ? ((item.count / stats.totalClicks) * 100).toFixed(1)
                    : '0.0'
                  
                  return (
                    <div key={item.network} className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${network.gradient}`}>
                        <network.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white font-medium">{network.name}</span>
                          <span className="text-gray-400 text-sm">{item.count} clicks ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div 
                            className={`bg-gradient-to-r ${network.gradient} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {stats.mostPopularNetwork && (
                <div className="mt-6 p-4 bg-gradient-to-r from-[#00f0ff]/10 to-[#ffd700]/10 border border-[#00f0ff]/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Most popular network</p>
                  <p className="text-xl font-bold text-[#00f0ff] capitalize">
                    {stats.mostPopularNetwork.network} - {stats.mostPopularNetwork.count} clicks
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00f0ff]" />
              Instrucciones
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-400">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#00f0ff] mt-0.5">•</span>
                <span>Enter the complete URLs of your social media (include https://)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00f0ff] mt-0.5">•</span>
                <span>Automatic validation will indicate if the format is correct (✓ green)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00f0ff] mt-0.5">•</span>
                <span>Use the &quot;Open&quot; buttons to verify that the link works</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00f0ff] mt-0.5">•</span>
                <span>Links will appear on your website and barber profiles</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Social Networks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {socialNetworks.map((network) => {
            const Icon = network.icon
            const url = settings[network.key] || ''
            const isActive = url && url.trim()
            const isValid = validations[network.key]
            const isCopied = copiedLink === network.name

            return (
              <Card 
                key={network.key} 
                className={`bg-gray-900 border-gray-800 transition-all hover:border-gray-700 ${
                  isActive ? 'ring-1 ring-gray-700' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 bg-gradient-to-br ${network.gradient} rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{network.name}</CardTitle>
                        <p className="text-xs text-gray-500">{network.example}</p>
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-1">
                        {isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={network.key} className="text-gray-300 text-sm mb-2 block">
                      URL of {network.name}
                    </Label>
                    <div className="relative">
                      <Input
                        id={network.key}
                        type="url"
                        placeholder={network.placeholder}
                        value={url}
                        onChange={(e) => handleChange(network.key, e.target.value)}
                        className={`bg-gray-800 border-gray-700 text-white pr-10 ${
                          isActive && !isValid ? 'border-red-500/50' : ''
                        } ${isActive && isValid ? 'border-green-500/50' : ''}`}
                      />
                      {isActive && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {isActive && !isValid && (
                      <p className="text-xs text-red-400 mt-1">
                        ⚠️ Invalid URL for {network.name}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isActive && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLink(url)}
                          className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(url, network.name)}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(network.key)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Preview Section */}
        <Card className="bg-gray-900 border-gray-800 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#00f0ff]" />
              Preview
            </CardTitle>
            <CardDescription>How your social media will look on the site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
              {socialNetworks.map((network) => {
                const Icon = network.icon
                const url = settings[network.key]
                const isActive = url && url.trim() && validations[network.key]

                return isActive ? (
                  <button
                    key={network.key}
                    onClick={() => handleOpenLink(url)}
                    className={`p-4 bg-gradient-to-br ${network.gradient} rounded-full hover:scale-110 transition-transform shadow-lg`}
                    title={network.name}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </button>
                ) : null
              })}
              {getValidCount() === 0 && (
                <p className="text-gray-500 text-sm py-8">
                  Social media icons will appear here once you add valid URLs
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Mobile) */}
        <div className="mt-8 lg:hidden">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
