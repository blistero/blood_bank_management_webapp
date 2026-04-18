import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

const LoginPage     = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'))
const DonorsPage     = lazy(() => import('@/features/donors/DonorsPage'))
const DonationsPage  = lazy(() => import('@/features/donations/DonationsPage'))
const RequestsPage   = lazy(() => import('@/features/requests/RequestsPage'))
const ReportsPage    = lazy(() => import('@/features/reports/ReportsPage'))
const MyProfilePage    = lazy(() => import('@/features/donors/MyProfilePage'))
const RegisterPage     = lazy(() => import('@/features/auth/RegisterPage'))
const UnauthorizedPage = lazy(() => import('@/features/auth/UnauthorizedPage'))
const CampsPage        = lazy(() => import('@/features/camps/CampsPage'))

const Loading = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
  </div>
)

export const router = createBrowserRouter([
  { path: '/login',        element: <Suspense fallback={<Loading />}><LoginPage /></Suspense> },
  { path: '/register',     element: <Suspense fallback={<Loading />}><RegisterPage /></Suspense> },
  { path: '/unauthorized', element: <Suspense fallback={<Loading />}><UnauthorizedPage /></Suspense> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/',           element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',  element: <Suspense fallback={<Loading />}><DashboardPage /></Suspense> },
          { path: '/donations',  element: <Suspense fallback={<Loading />}><DonationsPage /></Suspense> },
          { path: '/requests',   element: <Suspense fallback={<Loading />}><RequestsPage /></Suspense> },
          { path: '/camps',      element: <Suspense fallback={<Loading />}><CampsPage /></Suspense> },
          { path: '/my-profile', element: <Suspense fallback={<Loading />}><MyProfilePage /></Suspense> },

          // Admin / Staff only — any other role is redirected to /unauthorized
          {
            element: <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />,
            children: [
              { path: '/donors',    element: <Suspense fallback={<Loading />}><DonorsPage /></Suspense> },
              { path: '/inventory', element: <Suspense fallback={<Loading />}><InventoryPage /></Suspense> },
              { path: '/reports',   element: <Suspense fallback={<Loading />}><ReportsPage /></Suspense> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
