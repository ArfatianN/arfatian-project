'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('Email dan password wajib diisi')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Email atau password salah' : error.message)
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Image src="/lilur-icon.png" alt="Lilur IT Logo" width={64} height={64} className="h-16 w-auto" priority />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Masuk ke Akun Anda</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Atau <Link href="/sign-up" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">buat akun baru</Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          {/* ... form fields sama seperti sebelumnya ... */}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Alamat Email" />
            </div>
            <div>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password" />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">Lupa Password?</Link>
          </div>

          {error && <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4"><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}

          <button type="submit" disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="font-medium text-gray-700 dark:text-gray-300">Akun Demo:</p>
          <p>Customer: <span className="font-mono">customer@email.com</span> / <span className="font-mono">password123</span></p>
          <p>Admin: <span className="font-mono">admin@email.com</span> / <span className="font-mono">password123</span></p>
          <p className="mt-2">* Admin harus didaftarkan via <Link href="/admin-register" className="text-blue-500 hover:underline">Admin Register</Link></p>
        </div>
      </div>
    </div>
  )
}