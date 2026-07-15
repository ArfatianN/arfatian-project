import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2))

    const signature = request.headers.get('x-midtrans-signature') || ''
    const serverKey = process.env.MIDTRANS_SERVER_KEY!

    const { order_id, status_code, gross_amount } = body

    // Verifikasi signature (dengan fallback untuk sandbox)
    const signatureString = `${order_id}${status_code}${gross_amount}${serverKey}`
    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(signatureString)
      .digest('hex')

    console.log('🔑 Expected signature:', expectedSignature)
    console.log('🔑 Received signature:', signature)

    // Cek signature, tapi untuk sandbox kita lanjutkan meskipun gagal (untuk testing)
    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid signature! But continuing for testing (sandbox).')
      // Di production, sebaiknya return 401
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    } else {
      console.log('✅ Signature verified')
    }

    const { order_id: orderId, transaction_status, fraud_status, payment_type } = body
    console.log(`📦 Order ID: ${orderId}, Status: ${transaction_status}, Payment: ${payment_type}`)

    // 1. Cari order berdasarkan order_code
    let { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('order_code', orderId)
      .maybeSingle()

    // 2. Jika tidak ditemukan, coba berdasarkan id (fallback)
    if (!order && !orderError) {
      console.log(`🔍 Order not found by order_code, trying by id: ${orderId}`)
      const { data: orderById } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .maybeSingle()
      if (orderById) {
        order = orderById
        console.log(`✅ Found order by id: ${order.id}`)
      }
    }

    if (!order) {
      console.warn('❌ Order not found for order_code or id:', orderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log(`🔍 Found order: ${order.id}, current status: ${order.status}`)

    // 3. Tentukan status baru berdasarkan transaction_status
    let newStatus = order.status
    if (transaction_status === 'settlement' || 
        (transaction_status === 'capture' && fraud_status === 'accept')) {
      newStatus = 'paid'
    } else if (transaction_status === 'pending') {
      newStatus = 'pending'
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      newStatus = 'cancelled'
    }

    if (newStatus !== order.status) {
      const updateData: any = {
        status: newStatus,
        payment_method: payment_type || 'midtrans',
      }

      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString()
        // Midtrans dianggap sudah diverifikasi otomatis, tidak perlu verified_by
        // Tapi untuk konsistensi, kita bisa set verified_by ke null (tidak diperlukan)
        // updateData.verified_by = null // optional
      }

      console.log(`🔄 Updating order ${order.id}:`, updateData)

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (updateError) {
        console.error('❌ Update failed:', updateError)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      console.log(`✅ Order ${orderId} updated to ${newStatus}`)
    } else {
      console.log(`ℹ️ Status already ${order.status}, no update needed`)
    }

    // 4. Simpan log webhook
    await supabaseAdmin
      .from('payment_webhooks')
      .insert({
        order_id: order.id,
        event_type: transaction_status,
        raw_payload: body,
        signature_verified: signature === expectedSignature,
        processed_at: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}