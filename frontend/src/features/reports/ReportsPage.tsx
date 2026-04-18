import { useEffect, useState, useCallback } from 'react'
import {
  BarChart2, RefreshCw, AlertTriangle, Droplets,
  Users, Heart, ClipboardList, TrendingUp,
} from 'lucide-react'
import { reportApi } from '@/api/reportApi'
import type { DonationTrend, RequestTrend, InventoryByGroup } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface DonorByGroup {
  blood_group: string
  total: number
  eligible: number
  unavailable: number
}

interface DonationByGroup {
  blood_group: string
  count: number
  total_volume_ml: number
}

interface RequestByGroup {
  blood_group: string
  total: number
  fulfilled: number
  pending: number
  rejected: number
}

interface ReportData {
  donationTrend: DonationTrend[]
  requestTrend: RequestTrend[]
  inventory: InventoryByGroup[]
  donorsByGroup: DonorByGroup[]
  donationsByGroup: DonationByGroup[]
  requestsByGroup: RequestByGroup[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMonth(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function pct(num: number, denom: number): string {
  if (denom === 0) return '0%'
  return `${Math.round((num / denom) * 100)}%`
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SectionSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-10 rounded bg-gray-200" />
          <div className="h-3 flex-1 rounded bg-gray-100" />
          <div className="h-3 w-12 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

// ── Bar chart (pure CSS) ───────────────────────────────────────────────────

interface BarProps {
  label: string
  value: number
  max: number
  colorClass: string
  subLabel?: string
}

function Bar({ label, value, max, colorClass, subLabel }: BarProps) {
  const width = max > 0 ? `${Math.round((value / max) * 100)}%` : '0%'
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-right text-xs font-medium text-gray-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-gray-500">
        {value.toLocaleString()}
        {subLabel && <span className="ml-1 text-gray-400">{subLabel}</span>}
      </span>
    </div>
  )
}

// ── Trend sparkline (pure CSS) ─────────────────────────────────────────────

interface TrendRowProps {
  label: string
  value: number
  prev: number
}

function TrendRow({ label, value, prev }: TrendRowProps) {
  const delta = value - prev
  const sign = delta > 0 ? '+' : ''
  const color = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {prev !== undefined && (
          <span className={`text-xs font-medium ${color}`}>{sign}{delta}</span>
        )}
      </div>
    </div>
  )
}

// ── Section card ───────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary-500" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        donationTrendRes,
        requestTrendRes,
        inventoryRes,
        donorsByGroupRes,
        donationsByGroupRes,
        requestsByGroupRes,
      ] = await Promise.all([
        reportApi.donationTrend(),
        reportApi.requestTrend(),
        reportApi.inventoryByBloodGroup(),
        reportApi.donorsByBloodGroup(),
        reportApi.donationsByBloodGroup(),
        reportApi.requestsByBloodGroup(),
      ])
      setData({
        donationTrend:   donationTrendRes.data,
        requestTrend:    requestTrendRes.data,
        inventory:       inventoryRes.data,
        donorsByGroup:   donorsByGroupRes.data,
        donationsByGroup: donationsByGroupRes.data,
        requestsByGroup: requestsByGroupRes.data,
      })
    } catch {
      setError('Failed to load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Reports failed to load</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
        <button onClick={load} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  // Compute max values for bars
  const maxDonorTotal   = Math.max(1, ...(data?.donorsByGroup.map(r => r.total) ?? []))
  const maxDonation     = Math.max(1, ...(data?.donationsByGroup.map(r => r.count) ?? []))
  const maxInventory    = Math.max(1, ...(data?.inventory.map(r => r.available) ?? []))
  const maxReqTotal     = Math.max(1, ...(data?.requestsByGroup.map(r => r.total) ?? []))

  // Trend month-over-month (last two entries)
  const dt = data?.donationTrend ?? []
  const rt = data?.requestTrend ?? []
  const lastDonation = dt[dt.length - 1]
  const prevDonation = dt[dt.length - 2]
  const lastRequest  = rt[rt.length - 1]
  const prevRequest  = rt[rt.length - 2]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Blood bank analytics overview</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs py-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top row: Donation trend + Request trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <SectionCard title="Donation Trend (monthly)" icon={Heart}>
          {loading ? (
            <SectionSkeleton rows={6} />
          ) : dt.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No data available</p>
          ) : (
            <div>
              <div className="space-y-1">
                {dt.slice(-8).map((row, i, arr) => (
                  <TrendRow
                    key={row.month}
                    label={formatMonth(row.month)}
                    value={row.count}
                    prev={arr[i - 1]?.count ?? row.count}
                  />
                ))}
              </div>
              {lastDonation && prevDonation && (
                <p className="mt-3 text-xs text-gray-400">
                  Latest month ({formatMonth(lastDonation.month)}): {lastDonation.count} donations
                  · {(lastDonation.total_volume_ml / 1000).toFixed(1)} L collected
                </p>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Request Trend (monthly)" icon={ClipboardList}>
          {loading ? (
            <SectionSkeleton rows={6} />
          ) : rt.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No data available</p>
          ) : (
            <div>
              <div className="space-y-1">
                {rt.slice(-8).map((row, i, arr) => (
                  <TrendRow
                    key={row.month}
                    label={formatMonth(row.month)}
                    value={row.total}
                    prev={arr[i - 1]?.total ?? row.total}
                  />
                ))}
              </div>
              {lastRequest && prevRequest && (
                <p className="mt-3 text-xs text-gray-400">
                  Latest month ({formatMonth(lastRequest.month)}): {lastRequest.total} requests
                  · {lastRequest.fulfilled} fulfilled ({pct(lastRequest.fulfilled, lastRequest.total)})
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Middle row: Donations by group + Donors by group */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <SectionCard title="Donations by Blood Group" icon={TrendingUp}>
          {loading ? (
            <SectionSkeleton />
          ) : (data?.donationsByGroup ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No data available</p>
          ) : (
            <div className="space-y-2">
              {data?.donationsByGroup.map(r => (
                <Bar
                  key={r.blood_group}
                  label={r.blood_group}
                  value={r.count}
                  max={maxDonation}
                  colorClass="bg-primary-500"
                  subLabel={`(${(r.total_volume_ml / 1000).toFixed(1)}L)`}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Donors by Blood Group" icon={Users}>
          {loading ? (
            <SectionSkeleton />
          ) : (data?.donorsByGroup ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No data available</p>
          ) : (
            <div className="space-y-2">
              {data?.donorsByGroup.map(r => (
                <div key={r.blood_group} className="space-y-0.5">
                  <Bar
                    label={r.blood_group}
                    value={r.total}
                    max={maxDonorTotal}
                    colorClass="bg-blue-400"
                  />
                  <p className="pl-16 text-xs text-gray-400">
                    {r.eligible} eligible · {r.unavailable} unavailable
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Bottom row: Inventory + Requests by group */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <SectionCard title="Current Inventory by Blood Group" icon={Droplets}>
          {loading ? (
            <SectionSkeleton />
          ) : (data?.inventory ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No inventory data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Group</th>
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Avail</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Reserved</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Expired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.inventory.map(row => (
                    <tr key={`${row.blood_group}-${row.component_type}`}>
                      <td className="py-1.5 font-semibold text-gray-900">{row.blood_group}</td>
                      <td className="py-1.5 text-gray-500">{row.component_type}</td>
                      <td className={`py-1.5 text-right font-medium ${
                        row.available === 0 ? 'text-red-500'
                        : row.available <= 2 ? 'text-orange-600'
                        : 'text-green-600'
                      }`}>{row.available}</td>
                      <td className="py-1.5 text-right text-blue-600">{row.reserved}</td>
                      <td className="py-1.5 text-right text-red-400">{row.expired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Availability bars */}
              <div className="mt-4 space-y-1.5">
                {data?.inventory
                  .filter(r => r.available > 0)
                  .map(row => (
                    <Bar
                      key={`${row.blood_group}-${row.component_type}`}
                      label={row.blood_group}
                      value={row.available}
                      max={maxInventory}
                      colorClass={
                        row.available <= 2 ? 'bg-orange-400' : 'bg-green-400'
                      }
                      subLabel={row.component_type}
                    />
                  ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Requests by Blood Group" icon={BarChart2}>
          {loading ? (
            <SectionSkeleton />
          ) : (data?.requestsByGroup ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No data available</p>
          ) : (
            <div className="space-y-3">
              {data?.requestsByGroup.map(r => (
                <div key={r.blood_group} className="space-y-0.5">
                  <Bar
                    label={r.blood_group}
                    value={r.total}
                    max={maxReqTotal}
                    colorClass="bg-orange-400"
                  />
                  <p className="pl-16 text-xs text-gray-400">
                    {r.fulfilled} fulfilled ({pct(r.fulfilled, r.total)})
                    · {r.pending} pending
                    · {r.rejected} rejected
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
