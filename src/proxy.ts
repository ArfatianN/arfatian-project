import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // ==========================================
  // 1. BUAT RESPONSE YANG BISA DIMODIFIKASI
  // ==========================================
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ==========================================
  // 2. BUAT SUPABASE CLIENT DENGAN COOKIE MANAGEMENT
  // ==========================================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ==========================================
  // 3. AMBIL DATA USER YANG SEDANG LOGIN
  // ==========================================
  const { data: { user } } = await supabase.auth.getUser()

  // ==========================================
  // 4. AMBIL PATH YANG DIMINTA
  // ==========================================
  const path = request.nextUrl.pathname

  // ==========================================
  // 🔓 DAFTAR HALAMAN PUBLIK (TANPA LOGIN)
  // ==========================================
  const publicPaths = [
  '/',
  '/sign-in',
  '/sign-up',
  '/admin-register',
  '/forgot-password',
  '/reset-password',
  '/api/admin/register',
  '/api/midtrans/webhook',
]
  
  const isPublicPath = publicPaths.some(p => path === p || path.startsWith('/api/midtrans/webhook'))

  // ==========================================
  // 🔐 RULE 1: BELUM LOGIN → REDIRECT KE LOGIN
  // ==========================================
  if (!user && !isPublicPath) {
    const redirectUrl = new URL('/sign-in', request.url)
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }

  // ==========================================
  // 🔐 RULE 2: SUDAH LOGIN → CEK ROLE
  // ==========================================
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'

    // 🛡️ ADMIN RULES
    if (path.startsWith('/admin')) {
      if (role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 🛡️ CUSTOMER RULES
    if (path.startsWith('/dashboard') || 
        path.startsWith('/services') || 
        path.startsWith('/orders') || 
        path.startsWith('/chat') ||
        path.startsWith('/checkout')) {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }

    // 🔄 REDIRECT DARI HALAMAN LOGIN/DAFTAR
    if (path === '/sign-in' || path === '/sign-up') {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 🏠 REDIRECT DARI HALAMAN UTAMA ('/')
    if (path === '/') {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        return NextResponse.redirect(new URL('/services', request.url))
      }
    }
  }

  // ==========================================
  // ✅ SEMUA AMAN, LANJUTKAN
  // ==========================================
  return response
}

// ==========================================
// 📍 KONFIGURASI: PATH MANA YANG DIPROSES
// ==========================================
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}