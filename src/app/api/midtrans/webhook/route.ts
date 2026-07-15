import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2))

    // 1. Verifikasi signature
    const signature = request.headers.get('x-midtrans-signature') || ''
    const serverKey = process.env.MIDTRANS_SERVER_KEY!

    // Ambil data dari body
    const { order_id, status_code, gross_amount } = body

    // Signature string: order_id + status_code + gross_amount + server_key
    const signatureString = `${order_id}${status_code}${gross_amount}${serverKey}`

    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(signatureString)
      .digest('hex')

    console.log('🔑 Received signature:', signature)
    console.log('🔑 Expected signature:', expectedSignature)

    if (signature !== expectedSignature) {
      console.warn('❌ Invalid signature!')
      // Fallback untuk development
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development mode: skipping signature verification')
      } else {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.log('✅ Signature verified')
    }

    // 2. Ambil status pembayaran
    const { transaction_status, fraud_status, payment_type } = body
    console.log(`📦 Order ID: ${order_id}, Status: ${transaction_status}, Payment: ${payment_type}`)

    // 3. Cari order berdasarkan order_code
    let order = null
    let orderError = null

    const { data: orderData, error: findError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('order_code', order_id)  // order_code adalah kolom di database
      .maybeSingle()

    if (findError) {
      console.error('❌ Error finding order:', findError)
      orderError = findError
    } else {
      order = orderData
    }

    // Jika tidak ditemukan, coba cari berdasarkan id (fallback)
    if (!order) {
      console.log(`⚠️ Order not found by order_code, trying by id: ${order_id}`)
      const { data: orderById, error: byIdError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('id', order_id)
        .maybeSingle()

      if (byIdError) {
        console.error('❌ Error finding order by id:', byIdError)
        orderError = byIdError
      } else {
        order = orderById
      }
    }

    if (!order) {
      console.warn('❌ Order not found for order_id:', order_id)
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

    // 5. Update database jika status berubah
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
        console.error('❌ Update failed:', updateError)
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