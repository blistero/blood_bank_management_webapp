import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Users, Search, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Edit2, X, Loader2,
} from 'lucide-react'
import { donorApi } from '@/api/donorApi'
import { formatDate, cn } from '@/utils/helpers'
import type { DonorListItem } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// ── Zod schema (fields allowed by DonorProfileUpdateSerializer) ────────────

const editSchema = z.object({
  phone:         z.string().min(7, 'Enter a valid phone number'),
  city:          z.string().min(1, 'City is required'),
  address:       z.string().optional(),
  state:         z.string().optional(),
  pincode:       z.string().optional(),
  is_available:  z.boolean(),
  medical_notes: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

// ── Skeleton ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
          <div className="h-9 w-9 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 rounded bg-gray-200" />
            <div className="h-3 w-28 rounded bg-gray-100" />
          </div>
          <div className="h-5 w-12 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Edit modal ─────────────────────────────────────────────────────────────

interface EditModalProps {
  donor: DonorListItem
  onClose: () => void
  onSaved: () => void
}

function EditDonorModal({ donor, onClose, onSaved }: EditModalProps) {
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      phone:        donor.phone ?? '',
      city:         donor.city ?? '',
      address:      '',
      state:        '',
      pincode:      '',
      is_available: donor.is_available,
      medical_notes: '',
    },
  })

  const onSubmit = async (values: EditFormValues) => {
    setApiError(null)
    try {
      await donorApi.update(donor.id, values)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } }
      const detail =
        e?.response?.data?.detail ??
        e?.response?.data?.non_field_errors?.[0] ??
        'Failed to update donor. Please try again.'
      setApiError(detail)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Donor</h2>
            <p className="text-xs text-gray-400">{donor.full_name}</p>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className={cn('input', errors.phone && 'border-red-400')} {...register('phone')} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">City</label>
              <input className={cn('input', errors.city && 'border-red-400')} {...register('city')} />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <input className="input" {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">State</label>
              <input className="input" {...register('state')} />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" {...register('pincode')} />
            </div>
          </div>

          <div>
            <label className="label">Medical Notes</label>
            <textarea rows={2} className="input resize-none" {...register('medical_notes')} />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is_available"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
              {...register('is_available')}
            />
            <label htmlFor="is_available" className="text-sm text-gray-700">
              Available for donation
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Donor row ──────────────────────────────────────────────────────────────

interface DonorRowProps {
  donor: DonorListItem
  onEdit: (d: DonorListItem) => void
}

function DonorRow({ donor, onEdit }: DonorRowProps) {
  const initials = donor.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="table-td">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900">{donor.full_name}</p>
            <p className="text-xs text-gray-400">{donor.email}</p>
          </div>
        </div>
      </td>
      <td className="table-td text-sm text-gray-700">{donor.phone ?? '—'}</td>
      <td className="table-td text-sm text-gray-500">{donor.city ?? '—'}</td>
      <td className="table-td">
        {donor.blood_group ? (
          <span className="badge bg-primary-100 text-primary-700 font-semibold">{donor.blood_group}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
      <td className="table-td">
        {donor.is_eligible ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle className="h-3 w-3" /> Eligible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" /> Ineligible
          </span>
        )}
      </td>
      <td className="table-td text-sm text-gray-500">
        {donor.last_donation_date ? formatDate(donor.last_donation_date) : 'Never'}
      </td>
      <td className="table-td">
        <button
          onClick={() => onEdit(donor)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Edit donor"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

interface Filters {
  search: string
  blood_group: string
  is_eligible: string
  page: number
}

export default function DonorsPage() {
  const [donors, setDonors] = useState<DonorListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ search: '', blood_group: '', is_eligible: '', page: 1 })
  const [editDonor, setEditDonor] = useState<DonorListItem | null>(null)

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { page: filters.page }
      if (filters.search)      params.search = filters.search
      if (filters.blood_group) params.blood_group = filters.blood_group
      if (filters.is_eligible) params.is_eligible = filters.is_eligible
      const res = await donorApi.list(params)
      setDonors(res.data.results)
      setTotalCount(res.data.count)
    } catch {
      setError('Failed to load donors. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))
  }

  const hasFilters = filters.search || filters.blood_group || filters.is_eligible

  if (error && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Failed to load donors</p>
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
          <h2 className="text-xl font-bold text-gray-900">Donors</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${totalCount.toLocaleString()} donor${totalCount !== 1 ? 's' : ''} registered`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, or city…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>

        <select
          className="input w-36"
          value={filters.blood_group}
          onChange={e => setFilter('blood_group', e.target.value)}
        >
          <option value="">All groups</option>
          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          className="input w-36"
          value={filters.is_eligible}
          onChange={e => setFilter('is_eligible', e.target.value)}
        >
          <option value="">All donors</option>
          <option value="true">Eligible only</option>
          <option value="false">Ineligible only</option>
        </select>

        {hasFilters && (
          <button
            className="btn-secondary text-xs py-1.5"
            onClick={() => setFilters({ search: '', blood_group: '', is_eligible: '', page: 1 })}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}

        <button onClick={load} disabled={loading} className="btn-secondary text-xs py-1.5 ml-auto">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : donors.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-gray-400">
              <Users className="h-10 w-10 text-gray-200" />
              <p className="font-medium text-gray-500">No donors found</p>
              {hasFilters && <p>Try clearing your filters</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Donor</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">City</th>
                  <th className="table-th">Blood Group</th>
                  <th className="table-th">Eligibility</th>
                  <th className="table-th">Last Donation</th>
                  <th className="table-th w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donors.map(d => (
                  <DonorRow key={d.id} donor={d} onEdit={setEditDonor} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
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

      {/* Edit modal */}
      {editDonor && (
        <EditDonorModal
          donor={editDonor}
          onClose={() => setEditDonor(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
