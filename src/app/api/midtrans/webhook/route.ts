import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2))

    // 1. Verifikasi signature (Midtrans menggunakan HMAC-SHA512)
    const signature = request.headers.get('x-midtrans-signature') || ''
    const serverKey = process.env.MIDTRANS_SERVER_KEY!

    const { orders_id, status_code, gross_amount } = body

    // Format signature yang benar: order_id + status_code + gross_amount + server_key
    const signatureString = `${orders_id}${status_code}${gross_amount}${serverKey}`

    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(signatureString)
      .digest('hex')

    console.log('🔑 Expected signature:', expectedSignature)
    console.log('🔑 Received signature:', signature)

    if (signature !== expectedSignature) {
      console.warn('❌ Invalid signature!')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('✅ Signature verified')

    // 2. Ambil data dari webhook
    const { order_id, transaction_status, fraud_status, payment_type } = body
    console.log(`📦 Order ID: ${order_id}, Status: ${transaction_status}, Payment: ${payment_type}`)

    // 3. Cari order di database berdasarkan order_code
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('order_code', order_id)
      .maybeSingle()

    if (orderError || !order) {
      console.warn('❌ Order not found for order_code:', order_id, orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log(`🔍 Found order: ${order.id}, current status: ${order.status}`)

    // 4. Tentukan status baru
    let newStatus = order.status

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        newStatus = 'paid'
      }
    } else if (transaction_status === 'settlement') {
      newStatus = 'paid'
    } else if (transaction_status === 'pending') {
      newStatus = 'pending'
    } else if (transaction_status === 'deny' || 
               transaction_status === 'cancel' || 
               transaction_status === 'expire') {
      newStatus = 'cancelled'
    }

    console.log(`🔄 Updating status from ${order.status} to ${newStatus}`)

    // 5. Update database (pakai supabaseAdmin untuk bypass RLS)
    if (newStatus !== order.status) {
      const updateData: any = {
        status: newStatus,
        payment_method: payment_type || 'midtrans',
      }

      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (updateError) {
        console.error('❌ Failed to update order:', updateError)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      console.log(`✅ Order ${order_id} updated to ${newStatus}`)
    } else {
      console.log(`ℹ️ Status already ${order.status}, no update needed`)
    }

    // 6. Simpan log webhook
    await supabaseAdmin
      .from('payment_webhooks')
      .insert({
        order_id: order.id,
        event_type: transaction_status,
        raw_payload: body,
        signature_verified: true,
        processed_at: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}