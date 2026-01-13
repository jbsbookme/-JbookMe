import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET settings
export async function GET() {
  try {
    let settings = await prisma.settings.findFirst()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          shopName: 'Mi Barbería',
          address: '123 Calle Principal, Ciudad',
          phone: '+1 (555) 123-4567',
          email: 'info@mibarberia.com',
          latitude: 40.7128,
          longitude: -74.0060
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PUT update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[API Settings] Received data:', body)
    
    const { 
      shopName, 
      address, 
      phone, 
      email, 
      latitude, 
      longitude, 
      facebook, 
      instagram, 
      twitter, 
      tiktok, 
      youtube, 
      whatsapp,
      maleGenderImage,
      femaleGenderImage,
      galleryMaleCircleImage,
      galleryFemaleCircleImage
    } = body

    let settings = await prisma.settings.findFirst()
    console.log('[API Settings] Current settings:', settings?.id)

    // Build update data object (only include defined fields)
    const updateData: Prisma.SettingsUpdateInput = {}
    if (shopName !== undefined) updateData.shopName = shopName
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (latitude !== undefined) updateData.latitude = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (facebook !== undefined) updateData.facebook = facebook
    if (instagram !== undefined) updateData.instagram = instagram
    if (twitter !== undefined) updateData.twitter = twitter
    if (tiktok !== undefined) updateData.tiktok = tiktok
    if (youtube !== undefined) updateData.youtube = youtube
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp
    if (maleGenderImage !== undefined) updateData.maleGenderImage = maleGenderImage
    if (femaleGenderImage !== undefined) updateData.femaleGenderImage = femaleGenderImage
    if (galleryMaleCircleImage !== undefined) updateData.galleryMaleCircleImage = galleryMaleCircleImage
    if (galleryFemaleCircleImage !== undefined) updateData.galleryFemaleCircleImage = galleryFemaleCircleImage

    console.log('[API Settings] Update data:', updateData)

    if (!settings) {
      // Create if doesn't exist
      console.log('[API Settings] Creating new settings')
      settings = await prisma.settings.create({
        data: {
          shopName: shopName || 'Mi Barbería',
          address,
          phone,
          email,
          latitude,
          longitude,
          facebook,
          instagram,
          twitter,
          tiktok,
          youtube,
          whatsapp,
          maleGenderImage,
          femaleGenderImage,
          galleryMaleCircleImage,
          galleryFemaleCircleImage
        }
      })
      console.log('[API Settings] Created:', settings.id)
    } else {
      // Update existing (only fields that were sent)
      console.log('[API Settings] Updating settings:', settings.id)
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: updateData
      })
      console.log('[API Settings] Updated successfully')
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[API Settings] Error updating settings:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
