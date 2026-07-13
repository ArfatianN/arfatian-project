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

    if (!file) {
      return NextResponse.json({ error: 'File wajib diisi' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus gambar' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran max 2MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const fileBuffer = await file.arrayBuffer()

    // 🔥 Upload pakai supabase biasa (karena bucket public)
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Gagal upload: ' + uploadError.message }, { status: 500 })
    }

    // Dapatkan public URL (pakai supabaseAdmin atau supabase biasa, sama)
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(fileName)

    // ✅ Update database pakai supabaseAdmin (bypass RLS di tabel profiles)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Gagal update profile: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}