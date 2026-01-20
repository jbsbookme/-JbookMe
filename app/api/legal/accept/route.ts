import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
    }

    // Terms version is server-controlled; body.version is accepted for compatibility.
    const body = (await req.json()) as { version?: unknown }
    const requested = typeof body?.version === 'string' ? body.version.trim() : ''
    const termsVersion = requested || 'v1.0'

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        termsAccepted: true,
        termsVersion,
        termsAcceptedAt: new Date(),
        // Legacy fields (kept in sync)
        legalAcceptedVersion: termsVersion,
        legalAcceptedAt: new Date(),
      },
      select: { id: true },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error accepting legal:', error)
    return NextResponse.json({ message: 'Error al guardar aceptación' }, { status: 500 })
  }
}
