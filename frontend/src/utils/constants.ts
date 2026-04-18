export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const COMPONENT_TYPES = [
  { value: 'WB',  label: 'Whole Blood' },
  { value: 'RBC', label: 'Red Blood Cells' },
  { value: 'PLT', label: 'Platelets' },
  { value: 'PLS', label: 'Fresh Frozen Plasma' },
] as const

export const URGENCY_LEVELS = [
  { value: 'ROUTINE',  label: 'Routine' },
  { value: 'URGENT',   label: 'Urgent (24 hours)' },
  { value: 'CRITICAL', label: 'Critical (immediate)' },
] as const

export const ROLES = [
  { value: 'ADMIN',    label: 'Admin' },
  { value: 'STAFF',    label: 'Staff' },
  { value: 'DONOR',    label: 'Donor' },
  { value: 'HOSPITAL', label: 'Hospital' },
] as const

export const REQUEST_STATUSES = [
  { value: 'PENDING',              label: 'Pending',              color: 'yellow' },
  { value: 'APPROVED',             label: 'Approved',             color: 'blue' },
  { value: 'FULFILLED',            label: 'Fulfilled',            color: 'green' },
  { value: 'PARTIALLY_FULFILLED',  label: 'Partially Fulfilled',  color: 'orange' },
  { value: 'REJECTED',             label: 'Rejected',             color: 'red' },
  { value: 'CANCELLED',            label: 'Cancelled',            color: 'gray' },
] as const

export const DONATION_STATUSES = [
  { value: 'SCHEDULED',  label: 'Scheduled',  color: 'blue' },
  { value: 'COMPLETED',  label: 'Completed',  color: 'green' },
  { value: 'CANCELLED',  label: 'Cancelled',  color: 'gray' },
  { value: 'REJECTED',   label: 'Rejected',   color: 'red' },
] as const

export const UNIT_STATUSES = [
  { value: 'AVAILABLE',  label: 'Available',  color: 'green' },
  { value: 'RESERVED',   label: 'Reserved',   color: 'blue' },
  { value: 'USED',       label: 'Used',       color: 'gray' },
  { value: 'EXPIRED',    label: 'Expired',    color: 'red' },
  { value: 'DISCARDED',  label: 'Discarded',  color: 'orange' },
] as const

export const PAGE_SIZE = 20
