import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, RefreshCw, X, ChevronLeft, ChevronRight,
  Droplets, AlertTriangle, Filter,
} from 'lucide-react'
import { inventoryApi } from '@/api/inventoryApi'
import { cn, formatDate, getStatusColor, extractApiError } from '@/utils/helpers'
import { BLOOD_GROUPS, COMPONENT_TYPES, UNIT_STATUSES, PAGE_SIZE } from '@/utils/constants'
import type { BloodUnit, StockSummary, PaginatedResponse } from '@/types'

// ── Add-unit form schema ───────────────────────────────────────────────────

const addSchema = z.object({
  batch_number:     z.string().min(1, 'Batch number is required'),
  blood_group:      z.string().min(1, 'Blood group is required'),
  component_type:   z.string().min(1, 'Component type is required'),
  volume_ml:        z.coerce.number().min(50, 'Min 50 ml').max(1000, 'Max 1000 ml'),
  collected_date:   z.string().min(1, 'Collection date is required'),
  storage_location: z.string().optional(),
})
type AddFormValues = z.infer<typeof addSchema>

// ── Filter state ───────────────────────────────────────────────────────────

interface Filters {
  blood_group:     string
  component_type:  string
  status:          string
  expiring_soon:   boolean
  page:            number
}

const defaultFilters: Filters = {
  blood_group:    '',
  component_type: '',
  status:         '',
  expiring_soon:  false,
  page:           1,
}

// ── Skeleton helpers ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-gray-50">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 rounded bg-gray-200" style={{ width: `${60 + (i + j) * 7}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-3 space-y-1.5">
          <div className="h-3 w-10 rounded bg-gray-200" />
          <div className="h-6 w-8 rounded bg-gray-300" />
          <div className="h-3 w-16 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Add unit modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddUnitModal({ onClose, onSuccess }: AddModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddFormValues>({ resolver: zodResolver(addSchema) })

  const onSubmit = async (values: AddFormValues) => {
    setSubmitError(null)
    try {
      await inventoryApi.add({
        ...values,
        storage_location: values.storage_location ?? '',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setSubmitError(extractApiError(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">Add Blood Unit</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Batch number */}
            <div className="col-span-2">
              <label className="label">Batch Number</label>
              <input className={cn('input', errors.batch_number && 'border-red-400')}
                placeholder="e.g. BU-2026-005" {...register('batch_number')} />
              {errors.batch_number && <p className="mt-1 text-xs text-red-600">{errors.batch_number.message}</p>}
            </div>

            {/* Blood group */}
            <div>
              <label className="label">Blood Group</label>
              <select className={cn('input', errors.blood_group && 'border-red-400')} {...register('blood_group')}>
                <option value="">Select…</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.blood_group && <p className="mt-1 text-xs text-red-600">{errors.blood_group.message}</p>}
            </div>

            {/* Component type */}
            <div>
              <label className="label">Component</label>
              <select className={cn('input', errors.component_type && 'border-red-400')} {...register('component_type')}>
                <option value="">Select…</option>
                {COMPONENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.component_type && <p className="mt-1 text-xs text-red-600">{errors.component_type.message}</p>}
            </div>

            {/* Volume */}
            <div>
              <label className="label">Volume (ml)</label>
              <input type="number" className={cn('input', errors.volume_ml && 'border-red-400')}
                defaultValue={450} {...register('volume_ml')} />
              {errors.volume_ml && <p className="mt-1 text-xs text-red-600">{errors.volume_ml.message}</p>}
            </div>

            {/* Collection date */}
            <div>
              <label className="label">Collection Date</label>
              <input type="date" className={cn('input', errors.collected_date && 'border-red-400')}
                max={new Date().toISOString().split('T')[0]}
                {...register('collected_date')} />
              {errors.collected_date && <p className="mt-1 text-xs text-red-600">{errors.collected_date.message}</p>}
            </div>

            {/* Storage location */}
            <div className="col-span-2">
              <label className="label">Storage Location <span className="text-gray-400">(optional)</span></label>
              <input className="input" placeholder="e.g. Fridge A1" {...register('storage_location')} />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Expiry date will be auto-calculated from the collection date based on component type.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [units, setUnits]         = useState<PaginatedResponse<BloodUnit> | null>(null)
  const [summary, setSummary]     = useState<StockSummary[]>([])
  const [filters, setFilters]     = useState<Filters>(defaultFilters)
  const [loading, setLoading]     = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Fetch inventory list
  const loadUnits = useCallback(async (f: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number | boolean> = { page: f.page }
      if (f.blood_group)    params.blood_group    = f.blood_group
      if (f.component_type) params.component_type = f.component_type
      if (f.status)         params.status         = f.status
      if (f.expiring_soon)  params.expiring_soon  = true
      const { data } = await inventoryApi.list(params)
      setUnits(data)
    } catch {
      setError('Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch stock summary (separate, lighter call)
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const { data } = await inventoryApi.summary()
      setSummary(data)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => { loadUnits(filters) }, [filters, loadUnits])
  useEffect(() => { loadSummary() }, [loadSummary])

  const setFilter = (key: keyof Filters, value: string | boolean | number) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))

  const totalPages = units ? Math.ceil(units.count / PAGE_SIZE) : 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Blood Inventory</h2>
          <p className="text-sm text-gray-500">
            {units ? `${units.count} total units` : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadUnits(filters); loadSummary() }} className="btn-secondary text-xs py-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> Add Unit
          </button>
        </div>
      </div>

      {/* Stock summary */}
      {summaryLoading ? <SummarySkeleton /> : summary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {summary.map((s) => (
            <div key={`${s.blood_group}-${s.component_type}`}
              className={cn('card p-3', s.available_units === 0 && 'ring-2 ring-red-200')}>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                {s.blood_group} · {s.component_type}
              </p>
              <p className={cn(
                'mt-1 text-2xl font-bold',
                s.available_units === 0 ? 'text-red-500'
                  : s.available_units <= 2 ? 'text-orange-500'
                  : 'text-green-600'
              )}>
                {s.available_units}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">available</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />

        <select
          value={filters.blood_group}
          onChange={(e) => setFilter('blood_group', e.target.value)}
          className="input w-auto min-w-[110px] py-1.5 text-sm"
        >
          <option value="">All Groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={filters.component_type}
          onChange={(e) => setFilter('component_type', e.target.value)}
          className="input w-auto min-w-[140px] py-1.5 text-sm"
        >
          <option value="">All Components</option>
          {COMPONENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="input w-auto min-w-[130px] py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {UNIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={filters.expiring_soon}
            onChange={(e) => setFilter('expiring_soon', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Expiring within 7 days
        </label>

        {(filters.blood_group || filters.component_type || filters.status || filters.expiring_soon) && (
          <button
            onClick={() => setFilters(defaultFilters)}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-gray-600">{error}</p>
            <button onClick={() => loadUnits(filters)} className="btn-primary text-sm">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="table-th">Batch</th>
                    <th className="table-th">Group</th>
                    <th className="table-th">Component</th>
                    <th className="table-th">Collected</th>
                    <th className="table-th">Expires</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {loading ? (
                    <TableSkeleton />
                  ) : units?.results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                        No blood units match the current filters.
                      </td>
                    </tr>
                  ) : (
                    units?.results.map((unit) => (
                      <UnitRow key={unit.id} unit={unit} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Page {filters.page} of {totalPages} · {units?.count} total
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilter('page', filters.page - 1)}
                    disabled={filters.page === 1}
                    className="btn-secondary py-1.5 px-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setFilter('page', filters.page + 1)}
                    disabled={filters.page >= totalPages}
                    className="btn-secondary py-1.5 px-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add unit modal */}
      {showModal && (
        <AddUnitModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { loadUnits(filters); loadSummary() }}
        />
      )}
    </div>
  )
}

// ── Unit table row ─────────────────────────────────────────────────────────

function UnitRow({ unit }: { unit: BloodUnit }) {
  const expiryClass =
    unit.is_expired        ? 'text-red-600 font-medium'
    : unit.is_critical     ? 'text-orange-600 font-medium'
    : unit.days_to_expiry <= 7 ? 'text-yellow-600'
    : 'text-gray-700'

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="table-td font-mono text-xs text-gray-600">{unit.batch_number}</td>
      <td className="table-td">
        <span className="badge bg-primary-50 text-primary-700 font-semibold">
          {unit.blood_group}
        </span>
      </td>
      <td className="table-td text-gray-600">{unit.component_type_display}</td>
      <td className="table-td text-gray-500">{formatDate(unit.collected_date)}</td>
      <td className={cn('table-td', expiryClass)}>
        <span>{formatDate(unit.expiry_date)}</span>
        {!unit.is_expired && (
          <span className="ml-1.5 text-xs text-gray-400">({unit.days_to_expiry}d)</span>
        )}
      </td>
      <td className="table-td">
        <span className={cn('badge', getStatusColor(unit.status))}>
          {unit.status_display}
        </span>
      </td>
      <td className="table-td text-gray-500 max-w-[140px] truncate">
        {unit.storage_location || <span className="text-gray-300">—</span>}
      </td>
    </tr>
  )
}
