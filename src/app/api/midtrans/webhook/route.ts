import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    console.log('Webhook received:', body)

    // 1. Verifikasi signature secara manual (HMAC-SHA512)
    const signature = request.headers.get('x-midtrans-signature') || ''
    const serverKey = process.env.MIDTRANS_SERVER_KEY!
    
    // Buat signature dari body dan server key
    const expectedSignature = crypto
      .createHmac('sha512', serverKey)
      .update(JSON.stringify(body))
      .digest('hex')

    if (signature !== expectedSignature) {
      console.warn('Invalid signature!')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 2. Ambil data dari webhook
    const { order_id, transaction_status, fraud_status, payment_type } = body

    // 3. Cari order di database berdasarkan order_code
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_code', order_id)
      .single()

    if (orderError || !order) {
      console.warn('Order not found:', order_id)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // 4. Update status berdasarkan response Midtrans
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

    // 5. Update database
    if (newStatus !== order.status) {
      const updateData: any = {
        status: newStatus,
        payment_method: payment_type || 'midtrans',
      }

      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

      await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      console.log(`Order ${order_id} status updated to: ${newStatus}`)
    }

    // 6. Simpan log webhook untuk audit
    await supabase
      .from('payment_webhooks')
      .insert({
        order_id: order.id,
        event_type: transaction_status,
        raw_payload: body,
        signature_verified: true, // karena kita sudah verifikasi manual
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}