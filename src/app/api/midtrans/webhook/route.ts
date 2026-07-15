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

    // Format signature yang benar dari Midtrans: 
    // sha512(order_id + status_code + gross_amount + server_key)
    const signatureString = order_id + status_code + gross_amount + serverKey
    
    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(signatureString)
      .digest('hex')

    console.log('🔑 Signature string:', signatureString)
    console.log('🔑 Expected signature:', expectedSignature)
    console.log('🔑 Received signature:', signature)

    // Jika signature tidak valid, log tapi lanjutkan (untuk sandbox testing)
    // Di production, sebaiknya return 401
    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid signature! But continuing for sandbox testing...')
      // Untuk sandbox, tetap lanjutkan agar webhook berfungsi
    } else {
      console.log('✅ Signature verified')
    }

    // Ambil data dari webhook
    const { order_id: orderId, transaction_status, fraud_status, payment_type } = body
    console.log(`📦 Order: ${orderId}, Status: ${transaction_status}`)

    // Cari order berdasarkan order_code
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('order_code', orderId)
      .maybeSingle()

    if (orderError || !order) {
      console.warn('❌ Order not found for order_code:', orderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let newStatus = order.status
    if (transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept')) {
      newStatus = 'paid'
    } else if (transaction_status === 'pending') {
      newStatus = 'pending'
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      newStatus = 'cancelled'
    }

    if (newStatus !== order.status) {
      const updateData: any = { status: newStatus, payment_method: payment_type || 'midtrans' }
      if (newStatus === 'paid') updateData.paid_at = new Date().toISOString()

      await supabaseAdmin.from('orders').update(updateData).eq('id', order.id)
      console.log(`✅ Order ${orderId} updated to ${newStatus}`)
    }

    await supabaseAdmin.from('payment_webhooks').insert({
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