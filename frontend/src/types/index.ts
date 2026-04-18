// ── Auth ───────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'STAFF' | 'DONOR' | 'HOSPITAL'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  role: Role
  is_active: boolean
  date_joined: string
}

export interface AuthTokens {
  access: string
  refresh: string
  role: Role
  full_name: string
  email: string
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

// ── Donors ─────────────────────────────────────────────────────────────────

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type Gender = 'M' | 'F' | 'O'

export interface DonorProfile {
  id: number
  user: User
  blood_group: BloodGroup
  blood_group_display: string
  date_of_birth: string
  age: number
  gender: Gender
  gender_display: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  last_donation_date: string | null
  is_eligible: boolean
  is_complete: boolean
  next_eligible_date: string
  days_until_eligible: number
  is_available: boolean
  medical_notes: string
  created_at: string
  updated_at: string
}

export interface DonorListItem {
  id: number
  full_name: string
  email: string
  blood_group: BloodGroup
  city: string
  phone: string
  last_donation_date: string | null
  is_eligible: boolean
  is_available: boolean
}

// ── Inventory ──────────────────────────────────────────────────────────────

export type ComponentType = 'WB' | 'RBC' | 'PLT' | 'PLS'
export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED' | 'DISCARDED'

export interface BloodUnit {
  id: number
  batch_number: string
  blood_group: BloodGroup
  blood_group_display: string
  component_type: ComponentType
  component_type_display: string
  volume_ml: number
  collected_date: string
  expiry_date: string
  status: UnitStatus
  status_display: string
  storage_location: string
  donor: number | null
  donor_name: string
  recorded_by: number | null
  recorded_by_name: string
  notes: string
  is_expired: boolean
  days_to_expiry: number
  is_critical: boolean
  created_at: string
  updated_at: string
}

export interface StockSummary {
  blood_group: BloodGroup
  component_type: ComponentType
  total_units: number
  available_units: number
  reserved_units: number
  critical_units: number
  total_volume_ml: number
}

// ── Donations ──────────────────────────────────────────────────────────────

export type DonationStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'

export interface Donation {
  id: number
  donor: number
  donor_name: string
  donor_blood_group: BloodGroup
  scheduled_date: string
  donation_date: string | null
  status: DonationStatus
  status_display: string
  component_type: ComponentType
  component_type_display: string
  volume_ml: number
  blood_group: BloodGroup
  blood_unit: number | null
  rejection_reason: string
  notes: string
  recorded_by: number | null
  recorded_by_name: string
  created_at: string
  updated_at: string
}

// ── Blood Requests ─────────────────────────────────────────────────────────

export type UrgencyLevel = 'ROUTINE' | 'URGENT' | 'CRITICAL'
export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'FULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'REJECTED'
  | 'CANCELLED'

export interface BloodRequest {
  id: number
  requested_by: number
  requested_by_name: string
  patient_name: string
  blood_group: BloodGroup
  component_type: ComponentType
  component_type_display: string
  units_required: number
  units_fulfilled: number
  units_remaining: number
  urgency: UrgencyLevel
  urgency_display: string
  required_by_date: string
  is_overdue: boolean
  status: RequestStatus
  status_display: string
  rejection_reason: string
  notes: string
  reviewed_by: number | null
  reviewed_by_name: string
  created_at: string
  updated_at: string
}

// ── Reports ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_donors: number
  eligible_donors: number
  total_blood_units: number
  available_units: number
  expiring_soon_units: number
  pending_requests: number
  critical_requests: number
  total_donations_this_month: number
  fulfilled_requests_this_month: number
}

export interface DonationTrend {
  month: string
  count: number
  total_volume_ml: number
}

export interface RequestTrend {
  month: string
  total: number
  fulfilled: number
}

export interface InventoryByGroup {
  blood_group: BloodGroup
  component_type: ComponentType
  available: number
  reserved: number
  expired: number
  total_volume_ml: number
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ── Donation Camps ─────────────────────────────────────────────────────────

export type CampStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'

export interface DonationCamp {
  id: number
  title: string
  organizer: number
  organizer_name: string
  organizer_role: string
  hospital_name: string
  address: string
  city: string
  state: string
  latitude: string
  longitude: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  contact_phone: string
  description: string
  status: CampStatus
  status_display: string
  created_at: string
  updated_at: string
}

export interface DonationCampFormData {
  title: string
  hospital_name: string
  address: string
  city: string
  state: string
  latitude?: string
  longitude?: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  contact_phone?: string
  description?: string
  status?: CampStatus
}

// ── API error ─────────────────────────────────────────────────────────────

export interface ApiError {
  detail?: string
  [key: string]: string | string[] | undefined
}
