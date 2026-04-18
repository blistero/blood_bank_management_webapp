import { useEffect, useState, useCallback } from 'react'
import { MapPin, Calendar, Clock, Phone, Plus, Pencil, Trash2, RefreshCw, AlertTriangle, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { campsApi } from '@/api/campsApi'
import { useRole } from '@/hooks/useRole'
import { formatDate } from '@/utils/helpers'
import type { DonationCamp, DonationCampFormData, CampStatus } from '@/types'

// ── Schema ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const campSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  hospital_name: z.string().min(2, 'Hospital name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  start_date: z.string().refine(val => val >= today(), 'Start date must be today or in the future'),
  end_date: z.string().min(1, 'End date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  contact_phone: z.string().optional(),
  description: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
}).refine(d => d.end_date >= d.start_date, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
})

type CampFormValues = z.infer<typeof campSchema>

// ── Helpers ────────────────────────────────────────────────────────────────

function extractDrfError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed. Please try again.'
  const d = data as Record<string, unknown>
  if (typeof d.detail === 'string') return d.detail
  for (const key of Object.keys(d)) {
    const val = d[key]
    const msg = Array.isArray(val) ? (val[0] as string) : typeof val === 'string' ? val : null
    if (msg) return key === 'non_field_errors' ? msg : msg
  }
  return 'Request failed. Please try again.'
}

const STATUS_COLORS: Record<CampStatus, string> = {
  UPCOMING:  'bg-blue-100 text-blue-700',
  LIVE:      'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

// ── Camp Card ──────────────────────────────────────────────────────────────

interface CampCardProps {
  camp: DonationCamp
  canManage: boolean
  onEdit: (camp: DonationCamp) => void
  onDelete: (camp: DonationCamp) => void
}

function CampCard({ camp, canManage, onEdit, onDelete }: CampCardProps) {
  const isLive = camp.status === 'LIVE'
  return (
    <div className={`card flex flex-col gap-3 ${isLive ? 'ring-2 ring-green-400' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{camp.title}</h3>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{camp.hospital_name}</p>
        </div>
        <span className={`badge shrink-0 ${STATUS_COLORS[camp.status]}`}>{camp.status_display}</span>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
          <span className="truncate">{camp.address}, {camp.city}, {camp.state}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
          <span>
            {formatDate(camp.start_date)}
            {camp.end_date !== camp.start_date && ` – ${formatDate(camp.end_date)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-gray-400" />
          <span>{camp.start_time.slice(0, 5)} – {camp.end_time.slice(0, 5)}</span>
        </div>
        {camp.contact_phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-gray-400" />
            <span>{camp.contact_phone}</span>
          </div>
        )}
      </div>

      {camp.description && (
        <p className="text-xs text-gray-500 line-clamp-2 border-t border-gray-50 pt-2">{camp.description}</p>
      )}

      {canManage && (
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button onClick={() => onEdit(camp)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button onClick={() => onDelete(camp)} className="flex-1 justify-center text-xs py-1.5 btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-1.5 rounded-lg border border-gray-200 font-medium transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Camp Form Modal ────────────────────────────────────────────────────────

interface CampFormModalProps {
  camp: DonationCamp | null
  onClose: () => void
  onSaved: () => void
}

function CampFormModal({ camp, onClose, onSaved }: CampFormModalProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const isEdit = !!camp

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CampFormValues>({
    resolver: zodResolver(campSchema),
    defaultValues: camp ? {
      title: camp.title,
      hospital_name: camp.hospital_name,
      address: camp.address,
      city: camp.city,
      state: camp.state,
      start_date: camp.start_date,
      end_date: camp.end_date,
      start_time: camp.start_time.slice(0, 5),
      end_time: camp.end_time.slice(0, 5),
      contact_phone: camp.contact_phone ?? '',
      description: camp.description ?? '',
      latitude: camp.latitude ?? '',
      longitude: camp.longitude ?? '',
    } : {
      start_date: today(),
      end_date: today(),
      start_time: '09:00',
      end_time: '17:00',
    },
  })

  const onSubmit = async (values: CampFormValues) => {
    setApiError(null)
    try {
      const payload: DonationCampFormData = {
        ...values,
        latitude: values.latitude || undefined,
        longitude: values.longitude || undefined,
        contact_phone: values.contact_phone || undefined,
        description: values.description || undefined,
      }
      if (isEdit) {
        await campsApi.update(camp.id, payload)
      } else {
        await campsApi.create(payload)
      }
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } }
      setApiError(extractDrfError(err?.response?.data))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Camp' : 'Create Donation Camp'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {apiError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Camp Title</label>
              <input {...register('title')} className="input" placeholder="e.g. World Blood Donor Day Camp" />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="label">Hospital / Organizer</label>
              <input {...register('hospital_name')} className="input" placeholder="Hospital name" />
              {errors.hospital_name && <p className="mt-1 text-xs text-red-600">{errors.hospital_name.message}</p>}
            </div>

            <div>
              <label className="label">Contact Phone</label>
              <input {...register('contact_phone')} className="input" placeholder="+91 9..." />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input {...register('address')} className="input" placeholder="Street / area" />
              {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
            </div>

            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" placeholder="City" />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
            </div>

            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input" placeholder="State" />
              {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>}
            </div>

            <div>
              <label className="label">Start Date</label>
              <input {...register('start_date')} type="date" min={today()} className="input" />
              {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date.message}</p>}
            </div>

            <div>
              <label className="label">End Date</label>
              <input {...register('end_date')} type="date" min={today()} className="input" />
              {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date.message}</p>}
            </div>

            <div>
              <label className="label">Start Time</label>
              <input {...register('start_time')} type="time" className="input" />
              {errors.start_time && <p className="mt-1 text-xs text-red-600">{errors.start_time.message}</p>}
            </div>

            <div>
              <label className="label">End Time</label>
              <input {...register('end_time')} type="time" className="input" />
              {errors.end_time && <p className="mt-1 text-xs text-red-600">{errors.end_time.message}</p>}
            </div>

            <div>
              <label className="label">Latitude (optional)</label>
              <input {...register('latitude')} className="input" placeholder="e.g. 17.3850" />
            </div>

            <div>
              <label className="label">Longitude (optional)</label>
              <input {...register('longitude')} className="input" placeholder="e.g. 78.4867" />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Description (optional)</label>
              <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Details about the camp..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Camp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────

function DeleteModal({ camp, onClose, onDeleted }: { camp: DonationCamp; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await campsApi.delete(camp.id)
      onDeleted()
    } catch {
      setError('Failed to delete camp. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
          <Trash2 className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-center text-base font-semibold text-gray-900 mb-1">Delete Camp</h2>
        <p className="text-center text-sm text-gray-500 mb-4">
          Are you sure you want to delete <span className="font-medium text-gray-700">"{camp.title}"</span>? This cannot be undone.
        </p>
        {error && <p className="text-xs text-red-600 text-center mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={confirm} disabled={loading} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'All Statuses' },
  { value: 'UPCOMING',  label: 'Upcoming' },
  { value: 'LIVE',      label: 'Live' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function CampsPage() {
  const { isAdminOrStaff, role } = useRole()
  const canManage = isAdminOrStaff || role === 'HOSPITAL'

  const [camps, setCamps] = useState<DonationCamp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 12

  const [cityFilter, setCityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editCamp, setEditCamp] = useState<DonationCamp | null>(null)
  const [deleteCamp, setDeleteCamp] = useState<DonationCamp | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await campsApi.list({
        page,
        city: cityFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        ordering: 'start_date',
      })
      setCamps(res.data.results)
      setTotal(res.data.count)
    } catch {
      setError('Failed to load camps. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, cityFilter, statusFilter, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  const handleFilterChange = (setter: (v: string) => void, v: string) => {
    setter(v)
    setPage(1)
  }

  const onFormSaved = () => {
    setShowForm(false)
    setEditCamp(null)
    load()
  }

  const onDeleted = () => {
    setDeleteCamp(null)
    load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Blood Donation Camps</h2>
          <p className="text-sm text-gray-500">{total} camp{total !== 1 ? 's' : ''} found</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditCamp(null); setShowForm(true) }} className="btn-primary">
            <Plus className="h-4 w-4" /> New Camp
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input pl-9 w-56"
              placeholder="Search title, hospital…"
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="btn-secondary">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <input
          value={cityFilter}
          onChange={e => handleFilterChange(setCityFilter, e.target.value)}
          className="input w-40"
          placeholder="Filter by city…"
        />

        <select
          value={statusFilter}
          onChange={e => handleFilterChange(setStatusFilter, e.target.value)}
          className="input w-44"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button onClick={load} disabled={loading} className="btn-secondary ml-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={load} className="ml-auto underline text-red-700 hover:text-red-900">Retry</button>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-2/3 rounded bg-gray-100" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : camps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
          <MapPin className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-600">No camps found</p>
          <p className="text-sm">Try adjusting filters or{canManage ? ' create a new camp.' : ' check back later.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {camps.map(camp => (
            <CampCard
              key={camp.id}
              camp={camp}
              canManage={canManage}
              onEdit={c => { setEditCamp(c); setShowForm(true) }}
              onDelete={setDeleteCamp}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="btn-secondary disabled:opacity-40 text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="btn-secondary disabled:opacity-40 text-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <CampFormModal
          camp={editCamp}
          onClose={() => { setShowForm(false); setEditCamp(null) }}
          onSaved={onFormSaved}
        />
      )}
      {deleteCamp && (
        <DeleteModal
          camp={deleteCamp}
          onClose={() => setDeleteCamp(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
