'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useUser } from '@/contexts/user-context'
import { useI18n } from '@/lib/i18n/i18n-context'

const LEGAL_VERSION = '2026-01-19'

export function LegalAcceptanceGate() {
  const { status } = useSession()
  const { user, refreshUser, isLoading } = useUser()
  const { language } = useI18n()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  const needsAcceptance = useMemo(() => {
    if (status !== 'authenticated') return false
    if (!user) return false
    return (user.legalAcceptedVersion ?? null) !== LEGAL_VERSION
  }, [status, user])

  useEffect(() => {
    if (status !== 'authenticated') {
      setOpen(false)
      return
    }
    if (isLoading) return
    setOpen(needsAcceptance)
  }, [status, isLoading, needsAcceptance])

  const accept = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: LEGAL_VERSION }),
      })

      if (!res.ok) {
        throw new Error('Failed to accept legal terms')
      }

      await refreshUser()
      setOpen(false)
    } catch (e) {
      console.error(e)
      setOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Use shadcn Dialog but block closing by immediately re-opening.
  const onOpenChange = (next: boolean) => {
    if (!needsAcceptance) {
      setOpen(next)
      return
    }
    // Prevent closing until accepted.
    if (next) setOpen(true)
    else setOpen(true)
  }

  const title = language === 'es' ? 'Términos y Privacidad' : 'Terms & Privacy'
  const desc =
    language === 'es'
      ? 'Para continuar, debes aceptar los Términos de Servicio y la Política de Privacidad.'
      : 'To continue, you must accept the Terms of Service and Privacy Policy.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-black border border-gray-800 text-white"
        onEscapeKeyDown={(e) => {
          if (needsAcceptance) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (needsAcceptance) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-gray-300">{desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-gray-200">
          <div className="flex gap-2">
            <Link href="/terminos" className="flex-1">
              <Button variant="secondary" className="w-full bg-gray-800 text-white hover:bg-gray-700">
                {language === 'es' ? 'Ver Términos' : 'View Terms'}
              </Button>
            </Link>
            <Link href="/privacidad" className="flex-1">
              <Button variant="secondary" className="w-full bg-gray-800 text-white hover:bg-gray-700">
                {language === 'es' ? 'Ver Privacidad' : 'View Privacy'}
              </Button>
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            {language === 'es'
              ? 'Al continuar, aceptas los términos y la política. Versión: '
              : 'By continuing, you accept the terms and policy. Version: '}
            <span className="font-mono">{LEGAL_VERSION}</span>
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={accept}
            disabled={isSubmitting}
            className="w-full bg-[#00f0ff] text-black hover:bg-[#00d0df]"
          >
            {isSubmitting
              ? language === 'es'
                ? 'Guardando…'
                : 'Saving…'
              : language === 'es'
                ? 'Acepto y continuar'
                : 'I agree & continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
