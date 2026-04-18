import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Droplets, ClipboardList, Heart,
  AlertTriangle, RefreshCw, TrendingUp, Clock, MapPin, Tent,
} from 'lucide-react'
import { reportApi } from '@/api/reportApi'
import { campsApi } from '@/api/campsApi'
import { formatDate } from '@/utils/helpers'
import type { DashboardStats, InventoryByGroup, DonationCamp } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface ExpiringUnit {
  id: number
  batch_number: string
  blood_group: string
  component_type: string
  expiry_date: string
  days_to_expiry: number
  storage_location: string
}

interface DashboardData {
  stats: DashboardStats
  expiring: ExpiringUnit[]
  inventory: InventoryByGroup[]
  liveCamps: DonationCamp[]
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-3 w-32 rounded bg-gray-100" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

function AlertSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-3 w-48 rounded bg-gray-100" />
          </div>
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

// ── KPI card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number
  sub: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  highlight?: boolean
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, highlight }: KpiCardProps) {
  return (
    <div className={`card flex items-center justify-between gap-4 ${highlight ? 'ring-2 ring-orange-300' : ''}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="mt-1 text-xs text-gray-400">{sub}</p>
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
    </div>
  )
}

// ── Alert row ──────────────────────────────────────────────────────────────

function ExpiryAlertRow({ unit }: { unit: ExpiringUnit }) {
  const urgent = unit.days_to_expiry <= 2
  return (
    <div className={`flex items-center gap-3 rounded-lg p-3 ${urgent ? 'bg-red-50' : 'bg-orange-50'}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${urgent ? 'bg-red-100' : 'bg-orange-100'}`}>
        <Clock className={`h-4 w-4 ${urgent ? 'text-red-600' : 'text-orange-600'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {unit.batch_number} — {unit.blood_group} {unit.component_type}
        </p>
        <p className="text-xs text-gray-500">
          Expires {formatDate(unit.expiry_date)} · {unit.storage_location || 'No location'}
        </p>
      </div>
      <span className={`badge shrink-0 ${urgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
        {unit.days_to_expiry}d left
      </span>
    </div>
  )
}

function LowStockRow({ row }: { row: InventoryByGroup }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          Low stock — {row.blood_group} ({row.component_type})
        </p>
        <p className="text-xs text-gray-500">
          Only {row.available} unit{row.available !== 1 ? 's' : ''} available
        </p>
      </div>
      <span className="badge bg-yellow-100 text-yellow-700">{row.available} units</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, expiringRes, inventoryRes, liveCampsRes] = await Promise.all([
        reportApi.dashboard(),
        reportApi.expiringUnits(7),
        reportApi.inventoryByBloodGroup(),
        campsApi.live(),
      ])
      setData({
        stats: statsRes.data,
        expiring: expiringRes.data as ExpiringUnit[],
        inventory: inventoryRes.data,
        liveCamps: liveCampsRes.data,
      })
    } catch {
      setError('Failed to load dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Dashboard failed to load</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
        <button onClick={load} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  const stats = data?.stats
  const lowStock = (data?.inventory ?? []).filter((r) => r.available > 0 && r.available <= 2)
  const alerts = [...(data?.expiring ?? [])].sort((a, b) => a.days_to_expiry - b.days_to_expiry)
  const alertCount = alerts.length + lowStock.length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">Blood bank at a glance</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary text-xs py-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Total Donors"
              value={stats?.total_donors ?? 0}
              sub={`${stats?.eligible_donors ?? 0} eligible now`}
              icon={Users}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <KpiCard
              label="Available Units"
              value={stats?.available_units ?? 0}
              sub={`${stats?.expiring_soon_units ?? 0} expiring within 7 days`}
              icon={Droplets}
              iconBg="bg-primary-50"
              iconColor="text-primary-600"
              highlight={(stats?.expiring_soon_units ?? 0) > 0}
            />
            <KpiCard
              label="Pending Requests"
              value={stats?.pending_requests ?? 0}
              sub={`${stats?.critical_requests ?? 0} critical`}
              icon={ClipboardList}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
              highlight={(stats?.critical_requests ?? 0) > 0}
            />
            <KpiCard
              label="Donations This Month"
              value={stats?.total_donations_this_month ?? 0}
              sub={`${stats?.fulfilled_requests_this_month ?? 0} requests fulfilled`}
              icon={Heart}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
          </>
        )}
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Alerts panel */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Active Alerts</h3>
              {!loading && alertCount > 0 && (
                <span className="badge bg-orange-100 text-orange-700">{alertCount}</span>
              )}
            </div>
          </div>

          {loading ? (
            <AlertSkeleton />
          ) : alertCount === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="font-medium text-gray-600">All clear</p>
              <p>No expiring units or low-stock alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((u) => (
                <ExpiryAlertRow key={u.id} unit={u} />
              ))}
              {lowStock.map((r) => (
                <LowStockRow key={`${r.blood_group}-${r.component_type}`} row={r} />
              ))}
            </div>
          )}
        </div>

        {/* Stock summary panel */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Stock by Blood Group</h3>
          </div>

          {loading ? (
            <AlertSkeleton />
          ) : (data?.inventory ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-400">
              <p>No inventory data available</p>
            </div>
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
                  {data?.inventory.map((row) => (
                    <tr key={`${row.blood_group}-${row.component_type}`}>
                      <td className="py-2 font-semibold text-gray-900">{row.blood_group}</td>
                      <td className="py-2 text-gray-500">{row.component_type}</td>
                      <td className={`py-2 text-right font-medium ${row.available <= 2 && row.available > 0 ? 'text-orange-600' : row.available === 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {row.available}
                      </td>
                      <td className="py-2 text-right text-blue-600">{row.reserved}</td>
                      <td className="py-2 text-right text-red-500">{row.expired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Live camps widget */}
      {!loading && (data?.liveCamps ?? []).length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tent className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-gray-900">Live Donation Camps Today</h3>
              <span className="badge bg-green-100 text-green-700">{data!.liveCamps.length}</span>
            </div>
            <Link to="/camps" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data!.liveCamps.map(camp => (
              <div key={camp.id} className="rounded-lg border border-green-100 bg-green-50 p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-sm font-semibold text-gray-900 truncate">{camp.title}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{camp.city}, {camp.state}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{camp.start_time.slice(0, 5)} – {camp.end_time.slice(0, 5)}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{camp.hospital_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
