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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const serviceId = formData.get('serviceId') as string | null

    if (!file || !serviceId) {
      return NextResponse.json({ error: 'File dan serviceId wajib' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Harus gambar' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maksimal 2MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${serviceId}/${Date.now()}.${fileExt}`
    const fileBuffer = await file.arrayBuffer()

    // 🔥 Upload pakai supabaseAdmin (bypass RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('service-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Gagal upload: ' + uploadError.message }, { status: 500 })
    }

    // Dapatkan public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('service-images')
      .getPublicUrl(fileName)

    // Update service pakai supabaseAdmin
    const { error: updateError } = await supabaseAdmin
      .from('services')
      .update({ image_url: publicUrl })
      .eq('id', serviceId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Gagal update service: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Upload image error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}