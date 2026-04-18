import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—'
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, fmt) : '—'
}

export function formatDateTime(dateStr: string | null | undefined): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm')
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE:            'bg-green-100 text-green-800',
    FULFILLED:            'bg-green-100 text-green-800',
    COMPLETED:            'bg-green-100 text-green-800',
    APPROVED:             'bg-blue-100 text-blue-800',
    RESERVED:             'bg-blue-100 text-blue-800',
    SCHEDULED:            'bg-blue-100 text-blue-800',
    PENDING:              'bg-yellow-100 text-yellow-800',
    PARTIALLY_FULFILLED:  'bg-orange-100 text-orange-800',
    URGENT:               'bg-orange-100 text-orange-800',
    CRITICAL:             'bg-red-100 text-red-800',
    REJECTED:             'bg-red-100 text-red-800',
    EXPIRED:              'bg-red-100 text-red-800',
    DISCARDED:            'bg-gray-100 text-gray-600',
    CANCELLED:            'bg-gray-100 text-gray-600',
    USED:                 'bg-gray-100 text-gray-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function getUrgencyColor(urgency: string): string {
  const map: Record<string, string> = {
    ROUTINE:  'bg-gray-100 text-gray-700',
    URGENT:   'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  }
  return map[urgency] ?? 'bg-gray-100 text-gray-700'
}

export function formatVolume(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`
  return `${ml}ml`
}

export function extractApiError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred.'
  const e = error as Record<string, unknown>
  if (e.response && typeof e.response === 'object') {
    const data = (e.response as Record<string, unknown>).data
    if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>
      if (typeof d.detail === 'string') return d.detail
      const messages = Object.entries(d)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      return messages.join(' | ')
    }
  }
  if (typeof e.message === 'string') return e.message
  return 'An unexpected error occurred.'
}
