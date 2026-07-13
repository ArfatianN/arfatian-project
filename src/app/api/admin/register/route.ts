import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { email, password, full_name, secret_key } = body

    // Validasi input
    if (!email || !password || !secret_key) {
      return NextResponse.json(
        { error: 'Email, password, dan secret key wajib diisi' },
        { status: 400 }
      )
    }

    // Cek secret key dari environment
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'LilurIT2026!'
    if (secret_key !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Secret key tidak valid' },
        { status: 401 }
      )
    }

    // 1. Daftarkan user ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || 'Admin',
        },
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Gagal membuat user' },
        { status: 500 }
      )
    }

    // 2. Gunakan ADMIN CLIENT untuk bypass RLS
    // Upsert profile dengan role 'admin'
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: full_name || 'Admin',
        role: 'admin', // <- paksa role admin
        // phone dan avatar_url tidak diisi, biarkan null
      }, { onConflict: 'id' })

    if (upsertError) {
      console.error('Upsert profile error:', upsertError)
      // Jangan langsung gagal, karena user sudah terdaftar
      return NextResponse.json(
        { 
          message: 'User berhasil dibuat, tapi gagal mengupdate role admin. Silakan hubungi admin.',
          user: authData.user 
        },
        { status: 207 } // Multi-Status
      )
    }

    // 3. Berhasil
    return NextResponse.json({
      message: '✅ Admin berhasil didaftarkan! Silakan login.',
      user: authData.user,
    })

  } catch (error) {
    console.error('Register admin error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}