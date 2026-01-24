'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useUser } from '@/contexts/user-context'
import { useI18n } from '@/lib/i18n/i18n-context'

const TERMS_VERSION = 'v1.0'

export function LegalAcceptanceGate() {
  const { status } = useSession()
  const { user, refreshUser, isLoading } = useUser()
  const { language } = useI18n()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  const needsAcceptance = useMemo(() => {
    if (status !== 'authenticated') return false
    if (!user) return false
    const accepted = user.termsAccepted === true
    const versionOk = (user.termsVersion ?? null) === TERMS_VERSION
    return !accepted || !versionOk
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
    if (!checked) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: TERMS_VERSION }),
      })

      if (!res.ok) {
        throw new Error('Failed to accept legal terms')
      }

      await refreshUser()
      setOpen(false)
      setChecked(false)
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

  const title = language === 'es' ? 'Términos y Condiciones' : 'Terms & Conditions'
  const desc =
    language === 'es'
      ? 'Antes de continuar, confirma que leíste y aceptas nuestros Términos y la Política de Privacidad.'
      : 'Before you continue, please confirm you have read and accept our Terms and Privacy Policy.'

  const checkboxLabel =
    language === 'es'
      ? 'He leído y acepto los Términos y la Política de Privacidad.'
      : 'I have read and agree to the Terms and Privacy Policy.'

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

        <div className="space-y-4 text-sm text-gray-200">
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

          <label className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#00f0ff]"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-sm text-gray-200">{checkboxLabel}</span>
          </label>

          <p className="text-xs text-gray-400">
            {language === 'es' ? 'Versión: ' : 'Version: '}
            <span className="font-mono">{TERMS_VERSION}</span>
          </p>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col gap-2">
            <Button
              onClick={accept}
              disabled={isSubmitting || !checked}
              className="w-full bg-[#00f0ff] text-black hover:bg-[#00d0df] disabled:opacity-60"
            >
              {isSubmitting
                ? language === 'es'
                  ? 'Guardando…'
                  : 'Saving…'
                : language === 'es'
                  ? 'Aceptar y continuar'
                  : 'Accept and continue'}
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await signOut({ redirect: false });
                } finally {
                  window.location.assign('/');
                }
              }}
              className="w-full border-gray-700 text-white hover:bg-white/10"
            >
              {language === 'es' ? 'Cerrar sesión' : 'Sign out'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
