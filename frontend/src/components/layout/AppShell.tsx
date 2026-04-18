import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/donors':     'Donors',
  '/inventory':  'Blood Inventory',
  '/donations':  'Donations',
  '/requests':   'Blood Requests',
  '/reports':    'Reports',
  '/my-profile': 'My Profile',
}

export default function AppShell() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Blood Bank'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
