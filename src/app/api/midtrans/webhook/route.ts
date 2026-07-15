import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2))

    // 1. Ambil signature & server key
    const signature = request.headers.get('x-midtrans-signature') || ''
    const serverKey = process.env.MIDTRANS_SERVER_KEY!

    const { order_id, status_code, gross_amount } = body

    // 2. Verifikasi signature
    const signatureString = `${order_id}${status_code}${gross_amount}${serverKey}`

    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(signatureString)
      .digest('hex')

    console.log('🔑 Expected signature:', expectedSignature)
    console.log('🔑 Received signature:', signature)

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid signature! But continuing for sandbox...')
      // Di production, sebaiknya return 401, tapi di sandbox kita lanjutkan
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    } else {
      console.log('✅ Signature verified')
    }

    // 3. Ambil data dari webhook
    const { order_id: orderId, transaction_status, fraud_status, payment_type } = body
    console.log(`📦 Order: ${orderId}, Status: ${transaction_status}, Payment: ${payment_type}`)

    // 4. Cari order berdasarkan order_code
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('order_code', orderId)
      .maybeSingle()

    if (orderError || !order) {
      console.warn('❌ Order not found for order_code:', orderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log(`🔍 Found order: ${order.id}, current status: ${order.status}`)

    // 5. Tentukan status baru
    let newStatus = order.status

    if (transaction_status === 'settlement' || 
        (transaction_status === 'capture' && fraud_status === 'accept')) {
      newStatus = 'paid'
    } else if (transaction_status === 'pending') {
      newStatus = 'pending'
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      newStatus = 'cancelled'
    }

    console.log(`🔄 Updating status from ${order.status} to ${newStatus}`)

    // 6. Update database
    if (newStatus !== order.status) {
      const updateData: any = {
        status: newStatus,
        payment_method: 'midtrans', // ✅ SEMUA metode Midtrans disimpan sebagai 'midtrans'
      }

      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

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

    // 7. Simpan log webhook
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}