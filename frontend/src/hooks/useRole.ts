import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import type { Role } from '@/types'

export function useRole() {
  const user = useSelector((state: RootState) => state.auth.user)
  const role = user?.role ?? null

  return {
    role,
    isAdmin:          role === 'ADMIN',
    isStaff:          role === 'STAFF',
    isDonor:          role === 'DONOR',
    isHospital:       role === 'HOSPITAL',
    isAdminOrStaff:   role === 'ADMIN' || role === 'STAFF',
    can: (allowed: Role[]) => !!role && allowed.includes(role),
  }
}
