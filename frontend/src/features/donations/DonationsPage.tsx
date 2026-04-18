import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Heart, Plus, Search, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, X, Loader2, CheckCircle,
  XCircle, Clock,
} from 'lucide-react'
import { donationApi } from '@/api/donationApi'
import { donorApi } from '@/api/donorApi'
import { formatDate, cn } from '@/utils/helpers'
import type { Donation, DonorListItem } from '@/types'
import { useRole } from '@/hooks/useRole'

// ── Types ──────────────────────────────────────────────────────────────────

const COMPONENT_TYPES = [
  { value: 'WB',  label: 'Whole Blood' },
  { value: 'RBC', label: 'Red Blood Cells' },
  { value: 'PLT', label: 'Platelets' },
  { value: 'PLS', label: 'Plasma' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function getStatusBadge(status: Donation['status']) {
  switch (status) {
    case 'COMPLETED':  return 'bg-green-100 text-green-700'
    case 'SCHEDULED':  return 'bg-blue-100 text-blue-700'
    case 'CANCELLED':  return 'bg-gray-100 text-gray-600'
    case 'REJECTED':   return 'bg-red-100 text-red-700'
    default:           return 'bg-gray-100 text-gray-600'
  }
}

function StatusIcon({ status }: { status: Donation['status'] }) {
  switch (status) {
    case 'COMPLETED': return <CheckCircle className="h-3.5 w-3.5" />
    case 'SCHEDULED': return <Clock className="h-3.5 w-3.5" />
    case 'CANCELLED':
    case 'REJECTED':  return <XCircle className="h-3.5 w-3.5" />
    default:          return null
  }
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Schedule modal ─────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  donor:          z.number({ required_error: 'Select a donor' }).int().positive('Select a donor'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  component_type: z.string().min(1, 'Component type is required'),
  volume_ml:      z.number({ invalid_type_error: 'Enter volume in ml' }).int().min(200, 'Minimum 200 ml').max(500, 'Maximum 500 ml'),
  notes:          z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

interface ScheduleModalProps {
  onClose: () => void
  onSaved: () => void
}

function ScheduleModal({ onClose, onSaved }: ScheduleModalProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [donors, setDonors] = useState<DonorListItem[]>([])
  const [donorsLoading, setDonorsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { volume_ml: 450, component_type: 'WB' },
  })

  useEffect(() => {
    donorApi.list({ is_eligible: 'true', page_size: 200 })
      .then(res => setDonors(res.data.results))
      .catch(() => {/* best effort */})
      .finally(() => setDonorsLoading(false))
  }, [])

  const onSubmit = async (values: ScheduleFormValues) => {
    setApiError(null)
    try {
      await donationApi.schedule({
        donor: values.donor,
        scheduled_date: values.scheduled_date,
        component_type: values.component_type,
        volume_ml: values.volume_ml,
        notes: values.notes,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } }
      const detail =
        e?.response?.data?.detail ??
        e?.response?.data?.non_field_errors?.[0] ??
        'Failed to schedule donation. Please try again.'
      setApiError(detail)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Schedule Donation</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {apiError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {apiError}
            </div>
          )}

          <div>
            <label className="label">Eligible Donor</label>
            <select
              className={cn('input', errors.donor && 'border-red-400')}
              disabled={donorsLoading}
              onChange={e => setValue('donor', Number(e.target.value), { shouldValidate: true })}
              defaultValue=""
            >
              <option value="" disabled>{donorsLoading ? 'Loading donors…' : 'Select a donor'}</option>
              {donors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.blood_group ?? 'Unknown group'})
                </option>
              ))}
            </select>
            {errors.donor && <p className="mt-1 text-xs text-red-600">{errors.donor.message}</p>}
          </div>

          <div>
            <label className="label">Scheduled Date</label>
            <input
              type="date"
              className={cn('input', errors.scheduled_date && 'border-red-400')}
              {...register('scheduled_date')}
            />
            {errors.scheduled_date && <p className="mt-1 text-xs text-red-600">{errors.scheduled_date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Component Type</label>
              <select className={cn('input', errors.component_type && 'border-red-400')} {...register('component_type')}>
                {COMPONENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.component_type && <p className="mt-1 text-xs text-red-600">{errors.component_type.message}</p>}
            </div>
            <div>
              <label className="label">Volume (ml)</label>
              <input
                type="number"
                className={cn('input', errors.volume_ml && 'border-red-400')}
                {...register('volume_ml', { valueAsNumber: true })}
              />
              {errors.volume_ml && <p className="mt-1 text-xs text-red-600">{errors.volume_ml.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea rows={2} className="input resize-none" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling…</> : 'Schedule Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Complete modal ─────────────────────────────────────────────────────────

const completeSchema = z.object({
  donation_date:    z.string().min(1, 'Donation date is required'),
  storage_location: z.string().optional(),
  notes:            z.string().optional(),
})

type CompleteFormValues = z.infer<typeof completeSchema>

interface CompleteModalProps {
  donation: Donation
  onClose: () => void
  onSaved: () => void
}

function CompleteModal({ donation, onClose, onSaved }: CompleteModalProps) {
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { donation_date: new Date().toISOString().split('T')[0] },
  })

  const onSubmit = async (values: CompleteFormValues) => {
    setApiError(null)
    try {
      await donationApi.complete(donation.id, values)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setApiError(e?.response?.data?.detail ?? 'Failed to complete donation.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Complete Donation</h2>
            <p className="text-xs text-gray-400">{donation.donor_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {apiError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {apiError}
            </div>
          )}

          <div>
            <label className="label">Actual Donation Date</label>
            <input type="date" className={cn('input', errors.donation_date && 'border-red-400')} {...register('donation_date')} />
            {errors.donation_date && <p className="mt-1 text-xs text-red-600">{errors.donation_date.message}</p>}
          </div>
          <div>
            <label className="label">Storage Location</label>
            <input className="input" placeholder="e.g. Fridge A – Shelf 2" {...register('storage_location')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={2} className="input resize-none" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Completing…</> : 'Mark Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Cancel/Reject confirm modal ────────────────────────────────────────────

interface ActionModalProps {
  donation: Donation
  action: 'cancel' | 'reject'
  onClose: () => void
  onSaved: () => void
}

function ActionModal({ donation, action, onClose, onSaved }: ActionModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!reason.trim()) { setErr('Reason is required'); return }
    setLoading(true)
    try {
      if (action === 'cancel') await donationApi.cancel(donation.id, reason)
      else await donationApi.reject(donation.id, reason)
      onSaved()
      onClose()
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { detail?: string } } }
      setErr(ex?.response?.data?.detail ?? 'Action failed.')
    } finally {
      setLoading(false)
    }
  }

  const title = action === 'cancel' ? 'Cancel Donation' : 'Reject Donation'
  const label = action === 'cancel' ? 'Cancellation reason' : 'Rejection reason'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{err}</div>}
          <div>
            <label className="label">{label}</label>
            <textarea
              rows={3}
              className="input resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason…"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Back</button>
            <button onClick={submit} disabled={loading} className="btn-danger">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : title}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Donation row ───────────────────────────────────────────────────────────

interface DonationRowProps {
  donation: Donation
  canAct: boolean
  onComplete: (d: Donation) => void
  onCancel: (d: Donation) => void
  onReject: (d: Donation) => void
}

function DonationRow({ donation: d, canAct, onComplete, onCancel, onReject }: DonationRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="table-td">
        <p className="font-medium text-gray-900">{d.donor_name}</p>
        <p className="text-xs text-gray-400">{d.donor_blood_group}</p>
      </td>
      <td className="table-td text-sm text-gray-700">{formatDate(d.scheduled_date)}</td>
      <td className="table-td text-sm text-gray-500">{d.component_type_display}</td>
      <td className="table-td text-sm text-gray-500">{d.volume_ml} ml</td>
      <td className="table-td">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(d.status)}`}>
          <StatusIcon status={d.status} />
          {d.status_display}
        </span>
      </td>
      <td className="table-td text-sm text-gray-500">
        {d.recorded_by_name || '—'}
      </td>
      <td className="table-td">
        {canAct && d.status === 'SCHEDULED' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onComplete(d)}
              className="rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              Complete
            </button>
            <button
              onClick={() => onReject(d)}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => onCancel(d)}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

interface Filters {
  search: string
  status: string
  component_type: string
  page: number
}

type ActiveModal =
  | { type: 'schedule' }
  | { type: 'complete'; donation: Donation }
  | { type: 'cancel'; donation: Donation }
  | { type: 'reject'; donation: Donation }
  | null

export default function DonationsPage() {
  const { isAdminOrStaff, isDonor } = useRole()
  const [donations, setDonations] = useState<Donation[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', component_type: '', page: 1 })
  const [modal, setModal] = useState<ActiveModal>(null)

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isDonor) {
        // DONOR — scoped history endpoint, supports status + page only
        const params: Record<string, string | number> = { page: filters.page }
        if (filters.status) params.status = filters.status
        const res = await donationApi.myHistory(params)
        setDonations(res.data.results)
        setTotalCount(res.data.count)
      } else {
        // ADMIN / STAFF — full list with all filters
        const params: Record<string, string | number> = { page: filters.page }
        if (filters.search)         params.search = filters.search
        if (filters.status)         params.status = filters.status
        if (filters.component_type) params.component_type = filters.component_type
        const res = await donationApi.list(params)
        setDonations(res.data.results)
        setTotalCount(res.data.count)
      }
    } catch {
      setError('Failed to load donations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters, isDonor])

  useEffect(() => { load() }, [load])

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))
  }

  const hasFilters = filters.search || filters.status || filters.component_type

  if (error && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Failed to load donations</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
        <button onClick={load} className="btn-primary"><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Donations</h2>
          <p className="text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : isDonor
                ? `${totalCount.toLocaleString()} donation${totalCount !== 1 ? 's' : ''} in your history`
                : `${totalCount.toLocaleString()} donation${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isAdminOrStaff && (
          <button onClick={() => setModal({ type: 'schedule' })} className="btn-primary">
            <Plus className="h-4 w-4" /> Schedule Donation
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        {/* Search — admin/staff only (my-history endpoint doesn't support it) */}
        {isAdminOrStaff && (
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by donor name…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>
        )}

        <select
          className="input w-40"
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* Component type filter — admin/staff only (my-history doesn't filter by it) */}
        {isAdminOrStaff && (
          <select
            className="input w-40"
            value={filters.component_type}
            onChange={e => setFilter('component_type', e.target.value)}
          >
            <option value="">All types</option>
            {COMPONENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}

        {hasFilters && (
          <button
            className="btn-secondary text-xs py-1.5"
            onClick={() => setFilters({ search: '', status: '', component_type: '', page: 1 })}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}

        <button onClick={load} disabled={loading} className={cn('btn-secondary text-xs py-1.5', isAdminOrStaff ? 'ml-auto' : '')}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : donations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-gray-400">
              <Heart className="h-10 w-10 text-gray-200" />
              <p className="font-medium text-gray-500">No donations found</p>
              {hasFilters && <p>Try clearing your filters</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Donor</th>
                  <th className="table-th">Scheduled</th>
                  <th className="table-th">Component</th>
                  <th className="table-th">Volume</th>
                  <th className="table-th">Status</th>
                  {isAdminOrStaff && <th className="table-th">Recorded By</th>}
                  {isAdminOrStaff && <th className="table-th w-36"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donations.map(d => (
                  <DonationRow
                    key={d.id}
                    donation={d}
                    canAct={isAdminOrStaff}
                    onComplete={don => setModal({ type: 'complete', donation: don })}
                    onCancel={don => setModal({ type: 'cancel', donation: don })}
                    onReject={don => setModal({ type: 'reject', donation: don })}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination — shown for both roles */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {filters.page} of {totalPages} · {totalCount} total
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilter('page', filters.page - 1)}
                className="btn-secondary py-1 px-2 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={filters.page >= totalPages}
                onClick={() => setFilter('page', filters.page + 1)}
                className="btn-secondary py-1 px-2 text-xs disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals — admin/staff only */}
      {modal?.type === 'schedule' && (
        <ScheduleModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.type === 'complete' && (
        <CompleteModal donation={modal.donation} onClose={() => setModal(null)} onSaved={load} />
      )}
      {(modal?.type === 'cancel' || modal?.type === 'reject') && (
        <ActionModal
          donation={modal.donation}
          action={modal.type}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
