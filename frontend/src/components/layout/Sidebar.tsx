import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Droplets, Heart,
  ClipboardList, BarChart3, LogOut, Stethoscope, Tent,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { cn } from '@/utils/helpers'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['ADMIN','STAFF'] },
  { to: '/donors',     label: 'Donors',      icon: Users,           roles: ['ADMIN','STAFF'] },
  { to: '/inventory',  label: 'Inventory',   icon: Droplets,        roles: ['ADMIN','STAFF'] },
  { to: '/donations',  label: 'Donations',   icon: Heart,           roles: ['ADMIN','STAFF','DONOR'] },
  { to: '/requests',   label: 'Requests',    icon: ClipboardList,   roles: ['ADMIN','STAFF','HOSPITAL'] },
  { to: '/reports',    label: 'Reports',     icon: BarChart3,       roles: ['ADMIN','STAFF'] },
  { to: '/camps',      label: 'Blood Camps', icon: Tent,            roles: ['ADMIN','STAFF','DONOR','HOSPITAL'] },
  { to: '/my-profile', label: 'My Profile',  icon: Stethoscope,     roles: ['DONOR'] },
] as const

export default function Sidebar() {
  const { logout, user } = useAuth()
  const { can } = useRole()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <span className="text-base font-semibold text-gray-900">BloodBank</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, roles }) => {
          if (!can([...roles] as ('ADMIN'|'STAFF'|'DONOR'|'HOSPITAL')[])) return null
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-4 py-4">
        <div className="mb-3 truncate">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button onClick={() => logout()} className="btn-secondary w-full justify-center text-xs py-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
