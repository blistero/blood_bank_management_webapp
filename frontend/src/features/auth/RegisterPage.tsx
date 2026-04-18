import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Droplets, Loader2, CheckCircle } from 'lucide-react'
import { authApi } from '@/api/authApi'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/helpers'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name:  z.string().min(1, 'Last name is required'),
  email:      z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role:       z.enum(['DONOR', 'HOSPITAL'], { required_error: 'Select a role' }),
  phone:      z.string().optional(),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  password2:  z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.password2, {
  message: 'Passwords do not match',
  path: ['password2'],
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const onSubmit = async (values: FormValues) => {
    setApiError(null)
    try {
      await authApi.register(values)
      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string | string[]> } }
      const data = e?.response?.data
      if (data) {
        const firstKey = Object.keys(data)[0]
        const msg = firstKey ? (Array.isArray(data[firstKey]) ? (data[firstKey] as string[])[0] : data[firstKey] as string) : null
        setApiError(msg ?? 'Registration failed. Please try again.')
      } else {
        setApiError('Registration failed. Please try again.')
      }
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-red-100 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Account created!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your account has been created successfully. You can now sign in.
          </p>
          <Link to="/login" className="btn-primary mt-6 inline-flex justify-center">
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-red-100 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <Droplets className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500">Join the blood bank network</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-8 shadow-xl ring-1 ring-gray-100">

          {apiError && (
            <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input
                  className={cn('input', errors.first_name && 'border-red-400')}
                  placeholder="Jane"
                  {...register('first_name')}
                />
                {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  className={cn('input', errors.last_name && 'border-red-400')}
                  placeholder="Doe"
                  {...register('last_name')}
                />
                {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn('input', errors.email && 'border-red-400')}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Account Type</label>
              <select className={cn('input', errors.role && 'border-red-400')} {...register('role')}>
                <option value="">Select role…</option>
                <option value="DONOR">Donor</option>
                <option value="HOSPITAL">Hospital</option>
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
            </div>

            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                className="input"
                placeholder="+91 98765 43210"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn('input pr-10', errors.password && 'border-red-400')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn('input pr-10', errors.password2 && 'border-red-400')}
                  {...register('password2')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password2 && <p className="mt-1 text-xs text-red-600">{errors.password2.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
