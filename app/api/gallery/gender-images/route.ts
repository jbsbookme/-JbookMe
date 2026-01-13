import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication/permissions
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const gender = formData.get('gender') as string // 'male' or 'female'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!gender || !['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender. Must be "male" or "female"' },
        { status: 400 }
      )
    }

    // Validate it is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must not exceed 10MB' },
        { status: 400 }
      )
    }

    // Determine extension
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${gender}-${Date.now()}.${ext}`

    const blob = await put(`uploads/gender-images/${fileName}`, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    // Persist in Settings so frontend can read without relying on filesystem.
    const existing = await prisma.settings.findFirst({ select: { id: true } })
    const settings = existing
      ? await prisma.settings.update({
          where: { id: existing.id },
          data: gender === 'male' ? { maleGenderImage: blob.url } : { femaleGenderImage: blob.url },
          select: { maleGenderImage: true, femaleGenderImage: true },
        })
      : await prisma.settings.create({
          data: gender === 'male' ? { maleGenderImage: blob.url } : { femaleGenderImage: blob.url },
          select: { maleGenderImage: true, femaleGenderImage: true },
        })

    return NextResponse.json({
      success: true,
      url: blob.url,
      gender,
      settings,
      message: `${gender === 'male' ? 'Men\'s' : 'Women\'s'} image updated successfully`
    })
  } catch (error) {
    console.error('Error uploading gender image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
