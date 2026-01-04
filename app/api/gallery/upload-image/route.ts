import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { uploadFile, getFileUrl } from '@/lib/s3'

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

    console.log('[Upload] FormData keys:', Array.from(formData.keys()))
    console.log('[Upload] File received:', file ? { name: file.name, type: file.type, size: file.size } : 'null')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
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

    // Convert to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const fileName = `${timestamp}.${ext}`

    // Prefer S3 when available
    try {
      console.log('[Upload] Attempting S3 upload...')
      const cloud_storage_path = await uploadFile(buffer, `gallery/${fileName}`, true)
      const publicUrl = await getFileUrl(cloud_storage_path, true)
      console.log('[Upload] S3 upload successful:', publicUrl)

      return NextResponse.json({
        success: true,
        url: publicUrl,
        cloud_storage_path
      })
    } catch (s3Error) {
      console.log('[Upload] S3 failed, saving locally:', s3Error)
    }

    // Create directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'gallery')
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Public URL
    const publicUrl = `/uploads/gallery/${fileName}`

    console.log('[Upload] Image saved:', publicUrl)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      cloud_storage_path: publicUrl
    })
  } catch (error) {
    console.error('Error uploading gallery image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
