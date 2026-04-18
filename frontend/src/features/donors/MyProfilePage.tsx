import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Droplets, Heart, CheckCircle, XCircle,
  RefreshCw, AlertTriangle, Edit2, X, Loader2,
  Calendar, MapPin, Phone, ClipboardEdit,
} from 'lucide-react'
import { donorApi } from '@/api/donorApi'
import { donationApi } from '@/api/donationApi'
import { formatDate, cn } from '@/utils/helpers'
import type { DonorProfile, Donation, BloodGroup, Gender } from '@/types'

// ── Setup schema (first-time profile completion) ───────────────────────────

function ageFromDob(dob: string): number {
  const d = new Date(dob)
  const today = new Date()
  return today.getFullYear() - d.getFullYear() -
    (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
]

const setupSchema = z.object({
  blood_group: z.enum(BLOOD_GROUPS, { required_error: 'Blood group is required' }),
  date_of_birth: z.string()
    .min(1, 'Date of birth is required')
    .refine(val => ageFromDob(val) >= 18, 'You must be at least 18 years old')
    .refine(val => ageFromDob(val) <= 65, 'Donors must be 65 or younger'),
  gender: z.enum(['M', 'F', 'O'] as const, { required_error: 'Gender is required' }),
  phone: z.string().min(7, 'Phone number is required'),
  city: z.string().min(2, 'City is required'),
  address: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  medical_notes: z.string().optional(),
})

type SetupFormValues = z.infer<typeof setupSchema>

// ── Setup profile form (inline, no modal) ──────────────────────────────────

interface SetupProfileFormProps {
  defaultPhone?: string
  onSaved: (profile: DonorProfile) => void
}

function SetupProfileForm({ defaultPhone, onSaved }: SetupProfileFormProps) {
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { phone: defaultPhone ?? '' },
  })

  const onSubmit = async (values: SetupFormValues) => {
    setApiError(null)
    try {
      const res = await donorApi.setupMe({
        blood_group: values.blood_group as BloodGroup,
        date_of_birth: values.date_of_birth,
        gender: values.gender as Gender,
        phone: values.phone,
        city: values.city,
        address: values.address,
        state: values.state,
        pincode: values.pincode,
        medical_notes: values.medical_notes,
      })
      onSaved(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } }
      const d = e?.response?.data ?? {}
      const first = Object.values(d)[0]
      const msg = Array.isArray(first) ? (first[0] as string) : typeof first === 'string' ? first : null
      setApiError(msg ?? 'Could not save profile. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <ClipboardEdit className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Complete Your Profile</h2>
          <p className="text-sm text-gray-500">Fill in your details to start donating blood</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {apiError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Blood Group <span className="text-red-500">*</span></label>
              <select className={cn('input', errors.blood_group && 'border-red-400')} {...register('blood_group')}>
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.blood_group && <p className="mt-1 text-xs text-red-600">{errors.blood_group.message}</p>}
            </div>

            <div>
              <label className="label">Gender <span className="text-red-500">*</span></label>
              <select className={cn('input', errors.gender && 'border-red-400')} {...register('gender')}>
                <option value="">Select gender</option>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
            </div>

            <div>
              <label className="label">Date of Birth <span className="text-red-500">*</span></label>
              <input
                type="date"
                className={cn('input', errors.date_of_birth && 'border-red-400')}
                max={new Date().toISOString().split('T')[0]}
                {...register('date_of_birth')}
              />
              {errors.date_of_birth && <p className="mt-1 text-xs text-red-600">{errors.date_of_birth.message}</p>}
            </div>

            <div>
              <label className="label">Phone <span className="text-red-500">*</span></label>
              <input
                className={cn('input', errors.phone && 'border-red-400')}
                placeholder="Mobile number"
                {...register('phone')}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <input
                className={cn('input', errors.city && 'border-red-400')}
                placeholder="Your city"
                {...register('city')}
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
            </div>

            <div>
              <label className="label">State</label>
              <input className="input" placeholder="State" {...register('state')} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" placeholder="Street address" {...register('address')} />
            </div>

            <div>
              <label className="label">Pincode</label>
              <input className="input" placeholder="PIN code" {...register('pincode')} />
            </div>

            <div>
              <label className="label">Medical Notes</label>
              <input className="input" placeholder="Any medical conditions (optional)" {...register('medical_notes')} />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit schema (fields from DonorProfileUpdateSerializer) ─────────────────

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

// ── Donation status badge ──────────────────────────────────────────────────

function statusBadge(status: Donation['status']) {
  switch (status) {
    case 'COMPLETED':  return 'bg-green-100 text-green-700'
    case 'SCHEDULED':  return 'bg-blue-100 text-blue-700'
    case 'CANCELLED':  return 'bg-gray-100 text-gray-600'
    case 'REJECTED':   return 'bg-red-100 text-red-700'
    default:           return 'bg-gray-100 text-gray-600'
  }
}

// ── Edit profile modal ─────────────────────────────────────────────────────

interface EditModalProps {
  profile: DonorProfile
  onClose: () => void
  onSaved: (updated: DonorProfile) => void
}

function EditProfileModal({ profile, onClose, onSaved }: EditModalProps) {
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      phone:         profile.phone ?? '',
      city:          profile.city ?? '',
      address:       profile.address ?? '',
      state:         profile.state ?? '',
      pincode:       profile.pincode ?? '',
      is_available:  profile.is_available,
      medical_notes: profile.medical_notes ?? '',
    },
  })

  const onSubmit = async (values: EditFormValues) => {
    setApiError(null)
    try {
      const res = await donorApi.updateMe(values)
      onSaved(res.data)
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setApiError(e?.response?.data?.detail ?? 'Failed to update profile.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Edit Profile</h2>
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
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Profile skeleton ───────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="h-3 w-28 rounded bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function MyProfilePage() {
  const [profile, setProfile] = useState<DonorProfile | null>(null)
  const [history, setHistory] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await donorApi.getMe()
      setProfile(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e?.response?.status === 404) {
        // Legacy account: backend will auto-create on next GET, show setup form
        setProfile(null)
      } else {
        setError('Could not load your donor profile.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await donationApi.myHistory({ page_size: '10' })
      setHistory(res.data.results)
    } catch {/* non-fatal */}
    finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadHistory()
  }, [loadProfile, loadHistory])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
        </div>
        <div className="card">
          <ProfileSkeleton />
        </div>
      </div>
    )
  }

  // ── Unexpected error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Could not load profile</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
        <button onClick={loadProfile} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  // ── Setup form — profile missing or incomplete ───────────────────────────
  if (!profile || !profile.is_complete) {
    return (
      <SetupProfileForm
        defaultPhone={profile?.phone ?? undefined}
        onSaved={(saved) => {
          setProfile(saved)
          // Also reload history now that the profile exists
          loadHistory()
        }}
      />
    )
  }

  const initials = profile?.user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
        <button onClick={() => setEditOpen(true)} className="btn-secondary text-xs py-1.5">
          <Edit2 className="h-3.5 w-3.5" /> Edit Profile
        </button>
      </div>

      {/* Profile card */}
      <div className="card">
          <div className="space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                {initials}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{profile.user.full_name}</h3>
                <p className="text-sm text-gray-500">{profile.user.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="badge bg-primary-100 text-primary-700 font-semibold text-xs">
                    {profile.blood_group}
                  </span>
                  {profile.is_eligible ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle className="h-3 w-3" /> Eligible to donate
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                      <XCircle className="h-3 w-3" /> Not eligible yet
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-800">{profile.phone || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p className="text-sm font-medium text-gray-800">
                    {[profile.city, profile.state].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-800">
                    {profile.date_of_birth ? `${formatDate(profile.date_of_birth)} (age ${profile.age})` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Last Donation</p>
                  <p className="text-sm font-medium text-gray-800">
                    {profile.last_donation_date ? formatDate(profile.last_donation_date) : 'Never donated'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Gender</p>
                  <p className="text-sm font-medium text-gray-800">{profile.gender_display || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Next Eligible Date</p>
                  <p className="text-sm font-medium text-gray-800">
                    {profile.is_eligible
                      ? 'Eligible now'
                      : profile.next_eligible_date
                        ? `${formatDate(profile.next_eligible_date)} (${profile.days_until_eligible}d)`
                        : '—'}
                  </p>
                </div>
              </div>
            </div>

            {profile.medical_notes && (
              <div className="rounded-lg bg-yellow-50 px-4 py-3">
                <p className="text-xs font-medium text-yellow-700">Medical Notes</p>
                <p className="mt-1 text-sm text-gray-700">{profile.medical_notes}</p>
              </div>
            )}
          </div>
      </div>

      {/* Donation history */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary-500" />
          <h3 className="font-semibold text-gray-900">Recent Donations</h3>
        </div>

        {historyLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-400">
            <Heart className="h-8 w-8 text-gray-200" />
            <p>No donation history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Component</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Volume</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(d => (
                  <tr key={d.id}>
                    <td className="py-2 text-gray-700">{formatDate(d.scheduled_date)}</td>
                    <td className="py-2 text-gray-500">{d.component_type_display}</td>
                    <td className="py-2 text-right text-gray-500">{d.volume_ml} ml</td>
                    <td className="py-2 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(d.status)}`}>
                        {d.status_display}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editOpen && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProfile(updated)
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
