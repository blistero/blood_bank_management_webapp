import { ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldOff className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-500">
          You don&apos;t have permission to view this page. Contact your administrator if you think this is a mistake.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex justify-center">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
