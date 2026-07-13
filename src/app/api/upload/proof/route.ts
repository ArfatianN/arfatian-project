import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const orderId = formData.get('orderId') as string | null

    if (!file || !orderId) {
      return NextResponse.json({ error: 'File dan orderId wajib' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format tidak didukung' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maksimal 5MB' }, { status: 400 })
    }

    // Verifikasi order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order || order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Order tidak valid' }, { status: 403 })
    }

    const fileName = `${user.id}/${Date.now()}_${file.name}`
    const fileBuffer = await file.arrayBuffer()

    // 🔥 Upload pakai supabaseAdmin
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('payment-proofs')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Gagal upload: ' + uploadError.message }, { status: 500 })
    }

    // Dapatkan public URL (karena bucket public)
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('payment-proofs')
      .getPublicUrl(fileName)

    // Update order pakai supabaseAdmin
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ payment_proof_url: publicUrl })
      .eq('id', orderId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Gagal update order: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Upload proof error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}