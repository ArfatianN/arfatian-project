import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2))

    // 1. Ambil signature dan server key
    const signature = request.headers.get('x-midtrans-signature') || ''
    const serverKey = process.env.MIDTRANS_SERVER_KEY!

    // 2. Verifikasi signature
    const { order_id, status_code, gross_amount } = body

    // Format signature: order_id + status_code + gross_amount + server_key
    const signatureString = `${order_id}${status_code}${gross_amount}${serverKey}`

    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(signatureString)
      .digest('hex')

    console.log('🔑 Expected:', expectedSignature)
    console.log('🔑 Received:', signature)

    if (signature !== expectedSignature) {
      console.warn('❌ Invalid signature!')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('✅ Signature verified')

    // 3. Update status order (LANJUTKAN KODE DI SINI)
    const { transaction_status, fraud_status, payment_type } = body

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('order_code', order_id)
      .maybeSingle()

    if (orderError || !order) {
      console.warn('❌ Order not found:', order_id)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

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
        ...(newStatus === 'paid' && { paid_at: new Date().toISOString() })
      }

      await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      console.log(`✅ Order ${order_id} updated to ${newStatus}`)
    }

    // 4. Simpan log webhook
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