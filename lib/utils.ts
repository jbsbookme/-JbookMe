import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0'

  const numericValue =
    typeof value === 'number'
      ? value
      : Number(String(value).trim().replace(/[^0-9.-]/g, ''))

  if (!Number.isFinite(numericValue)) {
    const raw = String(value).trim()
    return raw.startsWith('$') ? raw : `$${raw}`
  }

  const cents = Math.round(numericValue * 100)
  const hasCents = cents % 100 !== 0
  return `$${hasCents ? numericValue.toFixed(2) : numericValue.toFixed(0)}`
}

export function resolvePublicMediaUrl(path: string | null | undefined): string {
  if (!path) return ''

  const trimmed = String(path).trim()
  if (!trimmed) return ''

  // Vercel Blob (and any other external media) should already be stored as a full URL.
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  // Same-origin public paths (legacy dev/local uploads).
  if (trimmed.startsWith('/')) return trimmed

  // Legacy values sometimes include a "public/" prefix.
  const publicUploadsIdx = trimmed.indexOf('public/uploads/')
  if (publicUploadsIdx >= 0) {
    return `/${trimmed.slice(publicUploadsIdx + 'public/'.length)}`
  }

  // Legacy values sometimes start with "uploads/...".
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`

  // If it's something else (e.g., old S3 keys), return as-is.
  return trimmed
}