'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'  // ✅ Import Image
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // State untuk form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Ambil redirect URL dari query parameter (jika ada)
  const redirectTo = searchParams.get('redirectTo') || '/'

  // Fungsi login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validasi sederhana
    if (!email || !password) {
      setError('Email dan password wajib diisi')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('Email atau password salah')
        } else {
          setError(error.message)
        }
      } else {
        // Login berhasil, redirect ke halaman yang dituju
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err) {
      setError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <div className="flex justify-center">
            {/* ✅ Ganti roket dengan logo */}
            <Image
              src="/lilur-icon.png"
              alt="Lilur IT Logo"
              width={64}
              height={64}
              className="h-16 w-auto"
              priority
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Masuk ke Akun Anda
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Atau{' '}
            <Link
              href="/sign-up"
              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              buat akun baru
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Alamat Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {/* Lupa Password */}
          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Lupa Password?
              </Link>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Tombol Submit */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Memproses...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="font-medium text-gray-700 dark:text-gray-300">Akun Demo:</p>
          <p className="mt-1">
            Customer: <span className="font-mono">customer@email.com</span> / <span className="font-mono">password123</span>
          </p>
          <p>
            Admin: <span className="font-mono">admin@email.com</span> / <span className="font-mono">password123</span>
          </p>
          <p className="mt-2 text-gray-400 dark:text-gray-500">
            * Admin harus didaftarkan via <Link href="/admin-register" className="text-blue-500 hover:underline">Admin Register</Link> atau manual di Supabase
          </p>
        </div>
      </div>
    </div>
  )
}