import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db'
import type { Prisma, Gender } from '@prisma/client'

// GET: Fetch all active gallery images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const gender = searchParams.get('gender')
    const tag = searchParams.get('tag')

    const whereClause: Prisma.GalleryImageWhereInput = includeInactive ? {} : { isActive: true }
    
    if (gender && gender !== 'ALL') {
      const allowedGenders: Gender[] = ['MALE', 'FEMALE', 'BOTH', 'UNISEX']
      if (allowedGenders.includes(gender as Gender)) {
        whereClause.gender = gender as Gender
        console.log(`[Gallery API] Filtering by gender: ${gender}`)
      }
    }
    
    if (tag) {
      whereClause.tags = {
        has: tag
      }
    }

    const images = await prisma.galleryImage.findMany({
      where: whereClause,
      include: {
        barber: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Images already contain a public URL in cloud_storage_path
    const imagesWithUrls = images.map((image) => {
      return {
        ...image,
        imageUrl: image.cloud_storage_path // Already contains /uploads/gallery/...
      }
    })

    console.log(`[Gallery API] Returning ${imagesWithUrls.length} images (gender: ${gender || 'ALL'})`)
    return NextResponse.json(imagesWithUrls)
  } catch (error) {
    console.error('Error fetching gallery images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

// POST: Create new gallery image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { cloud_storage_path, title, description, tags, gender, barberId, order } = body

    if (!cloud_storage_path || !title) {
      return NextResponse.json(
        { error: 'cloud_storage_path and title are required' },
        { status: 400 }
      )
    }

    const image = await prisma.galleryImage.create({
      data: {
        cloud_storage_path,
        title,
        description: description || null,
        tags: tags || [],
        gender: gender || 'UNISEX',
        barberId: barberId || null,
        order: order || 0,
        isPublic: true,
        isActive: true
      }
    })

    return NextResponse.json({
      ...image,
      imageUrl: image.cloud_storage_path // URL is already public
    })
  } catch (error) {
    console.error('Error creating gallery image:', error)
    return NextResponse.json(
      { error: 'Failed to create image' },
      { status: 500 }
    )
  }
}
