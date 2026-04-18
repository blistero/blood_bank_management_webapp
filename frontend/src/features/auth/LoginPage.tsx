import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Droplets, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/helpers'
import type { Role } from '@/types'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

const redirectByRole: Record<Role, string> = {
  ADMIN:    '/dashboard',
  STAFF:    '/dashboard',
  DONOR:    '/my-profile',
  HOSPITAL: '/requests',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error, isAuthenticated, user, clearError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectByRole[user.role], { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  // Clear Redux error when component mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  const onSubmit = async (values: FormValues) => {
    const result = await login(values.email, values.password)
    // Navigation is handled by the useEffect above once isAuthenticated flips
    if ((result as { error?: unknown }).error) return
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-red-100 px-4">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <Droplets className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Blood Bank Management</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-8 shadow-xl ring-1 ring-gray-100">

          {/* API error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn('input', errors.email && 'border-red-400 focus:border-red-500 focus:ring-red-500')}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'input pr-10',
                    errors.password && 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Register here
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-xl bg-white/70 px-5 py-4 text-xs text-gray-500 ring-1 ring-gray-200">
          <p className="font-semibold text-gray-700 mb-1">Demo credentials</p>
          <p>Admin — <span className="font-mono">admin@bloodbank.com</span> / <span className="font-mono">Admin@1234</span></p>
          <p className="mt-0.5">Donor — <span className="font-mono">donor@test.com</span> / <span className="font-mono">Test@1234</span></p>
          <p className="mt-0.5">Hospital — <span className="font-mono">hospital@care.com</span> / <span className="font-mono">Hospital@1234</span></p>
        </div>
      </div>
    </div>
  )
}
