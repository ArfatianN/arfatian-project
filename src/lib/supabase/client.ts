import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client untuk digunakan di Client Components (browser).
 * Menggunakan `createBrowserClient` dari `@supabase/ssr` yang sudah
 * dioptimalkan untuk Next.js App Router.
 *
 * Fungsi ini akan membaca environment variables:
 * - `NEXT_PUBLIC_SUPABASE_URL`
 * - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 *
 * Digunakan untuk operasi yang memerlukan interaksi langsung dengan
 * Supabase dari sisi klien, seperti:
 * - Login / Register (supabase.auth)
 * - Upload file ke Storage
 * - Query data dengan RLS (dengan session user yang sedang login)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}