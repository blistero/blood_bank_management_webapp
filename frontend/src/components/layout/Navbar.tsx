import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/helpers'

interface Props {
  title: string
}

const roleBadgeColor: Record<string, string> = {
  ADMIN:    'bg-red-100 text-red-700',
  STAFF:    'bg-blue-100 text-blue-700',
  DONOR:    'bg-green-100 text-green-700',
  HOSPITAL: 'bg-purple-100 text-purple-700',
}

export default function Navbar({ title }: Props) {
  const { user } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-4 w-4" />
        </button>
        {user && (
          <span className={cn('badge', roleBadgeColor[user.role] ?? 'bg-gray-100 text-gray-700')}>
            {user.role}
          </span>
        )}
      </div>
    </header>
  )
}
