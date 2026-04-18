import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ClipboardList, Plus, Search, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, X, Loader2, CheckCircle,
  XCircle, Clock, Zap, AlertCircle,
} from 'lucide-react'
import { requestApi } from '@/api/requestApi'
import { formatDate, cn } from '@/utils/helpers'
import type { BloodRequest } from '@/types'
import { useRole } from '@/hooks/useRole'

// ── Constants ──────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const COMPONENT_TYPES = [
  { value: 'WB',  label: 'Whole Blood' },
  { value: 'RBC', label: 'Red Blood Cells' },
  { value: 'PLT', label: 'Platelets' },
  { value: 'PLS', label: 'Plasma' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function getStatusBadge(status: BloodRequest['status']) {
  switch (status) {
    case 'FULFILLED':           return 'bg-green-100 text-green-700'
    case 'PARTIALLY_FULFILLED': return 'bg-teal-100 text-teal-700'
    case 'APPROVED':            return 'bg-blue-100 text-blue-700'
    case 'PENDING':             return 'bg-yellow-100 text-yellow-700'
    case 'REJECTED':
    case 'CANCELLED':           return 'bg-gray-100 text-gray-600'
    default:                    return 'bg-gray-100 text-gray-600'
  }
}

function getUrgencyBadge(urgency: BloodRequest['urgency']) {
  switch (urgency) {
    case 'CRITICAL': return 'bg-red-100 text-red-700'
    case 'URGENT':   return 'bg-orange-100 text-orange-700'
    default:         return 'bg-gray-100 text-gray-600'
  }
}

function UrgencyIcon({ urgency }: { urgency: BloodRequest['urgency'] }) {
  switch (urgency) {
    case 'CRITICAL': return <Zap className="h-3 w-3" />
    case 'URGENT':   return <AlertCircle className="h-3 w-3" />
    default:         return <Clock className="h-3 w-3" />
  }
}

function StatusIcon({ status }: { status: BloodRequest['status'] }) {
  switch (status) {
    case 'FULFILLED':
    case 'PARTIALLY_FULFILLED': return <CheckCircle className="h-3.5 w-3.5" />
    case 'APPROVED':            return <CheckCircle className="h-3.5 w-3.5" />
    case 'PENDING':             return <Clock className="h-3.5 w-3.5" />
    case 'REJECTED':
    case 'CANCELLED':           return <XCircle className="h-3.5 w-3.5" />
    default:                    return null
  }
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-5 w-14 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Create request modal ───────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const createSchema = z.object({
  patient_name:     z.string().min(1, 'Patient name is required'),
  blood_group:      z.string().min(1, 'Blood group is required'),
  component_type:   z.string().min(1, 'Component type is required'),
  units_required:   z.number({ invalid_type_error: 'Enter a number' }).int().min(1, 'At least 1 unit').max(20, 'Max 20 units'),
  urgency:          z.enum(['ROUTINE', 'URGENT', 'CRITICAL'], { required_error: 'Urgency is required' }),
  required_by_date: z.string()
    .min(1, 'Required by date is required')
    .refine(val => val >= today(), 'Date must be today or in the future'),
  notes:            z.string().optional(),
})

function extractDrfError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed. Please try again.'
  const d = data as Record<string, unknown>
  // Flat detail string
  if (typeof d.detail === 'string') return d.detail
  // Walk all keys; return the first error string found
  for (const key of Object.keys(d)) {
    const val = d[key]
    const msg = Array.isArray(val) ? (val[0] as string) : typeof val === 'string' ? val : null
    if (msg) return key === 'non_field_errors' ? msg : `${msg}`
  }
  return 'Request failed. Please try again.'
}

type CreateFormValues = z.infer<typeof createSchema>

interface CreateModalProps {
  onClose: () => void
  onSaved: () => void
}

function CreateRequestModal({ onClose, onSaved }: CreateModalProps) {
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { units_required: 1, urgency: 'ROUTINE', component_type: 'WB' },
  })

  const onSubmit = async (values: CreateFormValues) => {
    setApiError(null)
    try {
      await requestApi.create(values)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: unknown } }
      setApiError(extractDrfError(e?.response?.data))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">New Blood Request</h2>
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
            <label className="label">Patient Name</label>
            <input className={cn('input', errors.patient_name && 'border-red-400')} {...register('patient_name')} />
            {errors.patient_name && <p className="mt-1 text-xs text-red-600">{errors.patient_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Blood Group</label>
              <select className={cn('input', errors.blood_group && 'border-red-400')} {...register('blood_group')}>
                <option value="">Select…</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.blood_group && <p className="mt-1 text-xs text-red-600">{errors.blood_group.message}</p>}
            </div>
            <div>
              <label className="label">Component Type</label>
              <select className={cn('input', errors.component_type && 'border-red-400')} {...register('component_type')}>
                {COMPONENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.component_type && <p className="mt-1 text-xs text-red-600">{errors.component_type.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Units Required</label>
              <input
                type="number"
                min={1}
                max={20}
                className={cn('input', errors.units_required && 'border-red-400')}
                {...register('units_required', { valueAsNumber: true })}
              />
              {errors.units_required && <p className="mt-1 text-xs text-red-600">{errors.units_required.message}</p>}
            </div>
            <div>
              <label className="label">Urgency</label>
              <select className={cn('input', errors.urgency && 'border-red-400')} {...register('urgency')}>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="CRITICAL">Critical</option>
              </select>
              {errors.urgency && <p className="mt-1 text-xs text-red-600">{errors.urgency.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Required By Date</label>
            <input
              type="date"
              min={today()}
              className={cn('input', errors.required_by_date && 'border-red-400')}
              {...register('required_by_date')}
            />
            {errors.required_by_date && <p className="mt-1 text-xs text-red-600">{errors.required_by_date.message}</p>}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea rows={2} className="input resize-none" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reject modal ───────────────────────────────────────────────────────────

interface RejectModalProps {
  request: BloodRequest
  onClose: () => void
  onSaved: () => void
}

function RejectModal({ request, onClose, onSaved }: RejectModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!reason.trim()) { setErr('Rejection reason is required'); return }
    setLoading(true)
    try {
      await requestApi.reject(request.id, reason)
      onSaved()
      onClose()
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { detail?: string } } }
      setErr(ex?.response?.data?.detail ?? 'Failed to reject request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Reject Request</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-500">
            Patient: <span className="font-medium text-gray-800">{request.patient_name}</span>
          </p>
          {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{err}</div>}
          <div>
            <label className="label">Rejection Reason</label>
            <textarea
              rows={3}
              className="input resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason…"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={submit} disabled={loading} className="btn-danger">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Rejecting…</> : 'Reject Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Request row ────────────────────────────────────────────────────────────

interface RequestRowProps {
  request: BloodRequest
  isAdminOrStaff: boolean
  isHospital: boolean
  onApprove: (r: BloodRequest) => void
  onReject: (r: BloodRequest) => void
  onCancel: (r: BloodRequest) => void
}

function RequestRow({ request: r, isAdminOrStaff, isHospital, onApprove, onReject, onCancel }: RequestRowProps) {
  const [actLoading, setActLoading] = useState(false)

  const handleApprove = async () => {
    setActLoading(true)
    try { onApprove(r) } finally { setActLoading(false) }
  }

  return (
    <tr className={cn('hover:bg-gray-50 transition-colors', r.is_overdue && r.status === 'PENDING' ? 'bg-red-50/40' : '')}>
      <td className="table-td">
        <p className="font-medium text-gray-900">{r.patient_name}</p>
        <p className="text-xs text-gray-400">{r.requested_by_name}</p>
      </td>
      <td className="table-td">
        <span className="font-semibold text-gray-900">{r.blood_group}</span>
        <span className="ml-1 text-xs text-gray-500">({r.component_type})</span>
      </td>
      <td className="table-td text-sm text-gray-700">
        {r.units_fulfilled}/{r.units_required}
      </td>
      <td className="table-td">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getUrgencyBadge(r.urgency)}`}>
          <UrgencyIcon urgency={r.urgency} />
          {r.urgency_display}
        </span>
      </td>
      <td className="table-td">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(r.status)}`}>
          <StatusIcon status={r.status} />
          {r.status_display}
        </span>
      </td>
      <td className="table-td text-sm text-gray-500">
        <span className={r.is_overdue ? 'text-red-600 font-medium' : ''}>
          {formatDate(r.required_by_date)}
          {r.is_overdue && ' ⚠'}
        </span>
      </td>
      <td className="table-td">
        <div className="flex items-center gap-1">
          {isAdminOrStaff && r.status === 'PENDING' && (
            <>
              <button
                disabled={actLoading}
                onClick={handleApprove}
                className="rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(r)}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {(isHospital || isAdminOrStaff) && (r.status === 'PENDING' || r.status === 'APPROVED') && (
            <button
              onClick={() => onCancel(r)}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

interface Filters {
  search: string
  status: string
  urgency: string
  blood_group: string
  page: number
}

type ActiveModal =
  | { type: 'create' }
  | { type: 'reject'; request: BloodRequest }
  | { type: 'cancel'; request: BloodRequest }
  | null

export default function RequestsPage() {
  const { isAdminOrStaff, isHospital } = useRole()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', urgency: '', blood_group: '', page: 1 })
  const [modal, setModal] = useState<ActiveModal>(null)

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number | boolean> = { page: filters.page }
      if (filters.search)      params.search = filters.search
      if (filters.status)      params.status = filters.status
      if (filters.urgency)     params.urgency = filters.urgency
      if (filters.blood_group) params.blood_group = filters.blood_group
      const res = await requestApi.list(params)
      setRequests(res.data.results)
      setTotalCount(res.data.count)
    } catch {
      setError('Failed to load requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))
  }

  const handleApprove = async (r: BloodRequest) => {
    try {
      await requestApi.approve(r.id)
      load()
    } catch {/* ignore */}
  }

  const handleCancel = async (r: BloodRequest) => {
    try {
      await requestApi.cancel(r.id)
      load()
    } catch {/* ignore */}
  }

  const hasFilters = filters.search || filters.status || filters.urgency || filters.blood_group

  if (error && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Failed to load requests</p>
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
          <h2 className="text-xl font-bold text-gray-900">Blood Requests</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${totalCount.toLocaleString()} request${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {(isHospital || isAdminOrStaff) && (
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary">
            <Plus className="h-4 w-4" /> New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by patient or requester…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>

        <select className="input w-36" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="PARTIALLY_FULFILLED">Partial</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select className="input w-32" value={filters.urgency} onChange={e => setFilter('urgency', e.target.value)}>
          <option value="">All urgency</option>
          <option value="CRITICAL">Critical</option>
          <option value="URGENT">Urgent</option>
          <option value="ROUTINE">Routine</option>
        </select>

        <select className="input w-28" value={filters.blood_group} onChange={e => setFilter('blood_group', e.target.value)}>
          <option value="">All groups</option>
          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {hasFilters && (
          <button
            className="btn-secondary text-xs py-1.5"
            onClick={() => setFilters({ search: '', status: '', urgency: '', blood_group: '', page: 1 })}
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
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-gray-400">
              <ClipboardList className="h-10 w-10 text-gray-200" />
              <p className="font-medium text-gray-500">No requests found</p>
              {hasFilters && <p>Try clearing your filters</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="table-th">Patient / Requester</th>
                  <th className="table-th">Blood</th>
                  <th className="table-th">Units</th>
                  <th className="table-th">Urgency</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Required By</th>
                  <th className="table-th w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    isAdminOrStaff={isAdminOrStaff}
                    isHospital={isHospital}
                    onApprove={handleApprove}
                    onReject={req => setModal({ type: 'reject', request: req })}
                    onCancel={handleCancel}
                  />
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

      {/* Modals */}
      {modal?.type === 'create' && (
        <CreateRequestModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.type === 'reject' && (
        <RejectModal request={modal.request} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}
