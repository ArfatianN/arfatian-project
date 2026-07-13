import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Ambil semua jasa
export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST: Tambah jasa baru
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Validasi
  if (!body.name || !body.price) {
    return NextResponse.json(
      { error: 'Nama dan harga wajib diisi' },
      { status: 400 }
    )
  }

  // Ambil user yang login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cek role admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Insert data
  const { data, error } = await supabase
    .from('services')
    .insert({
      name: body.name,
      description: body.description || null,
      price: Number(body.price),
      duration: Number(body.duration) || 1,
      is_active: body.is_active ?? true,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PUT: Update jasa
export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json(
      { error: 'ID jasa wajib diisi' },
      { status: 400 }
    )
  }

  // Ambil user yang login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cek role admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update data
  const { data, error } = await supabase
    .from('services')
    .update({
      name: body.name,
      description: body.description || null,
      price: Number(body.price),
      duration: Number(body.duration) || 1,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE: Hapus jasa
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'ID jasa wajib diisi' },
      { status: 400 }
    )
  }

  // Ambil user yang login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cek role admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Hapus data
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}