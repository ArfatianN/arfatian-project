import { createClient } from '@/lib/supabase/server'
import { snap } from '@/lib/midtrans'
import { NextResponse } from 'next/server'

// ✅ Pastikan API route tidak di-static-kan
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    console.log('🔵 [Transaction] Request received')

    // 1. Parse body
    const body = await request.json().catch(() => null)
    if (!body) {
      console.error('❌ [Transaction] Invalid JSON body')
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { orderId } = body
    console.log(`🔵 [Transaction] Order ID: ${orderId}`)

    if (!orderId) {
      console.error('❌ [Transaction] Missing orderId')
      return NextResponse.json(
        { error: 'orderId wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 2. Ambil data order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ [Transaction] Order not found:', orderError)
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      )
    }

    console.log(`🔵 [Transaction] Order found: ${order.order_code}, status: ${order.status}`)

    if (order.status !== 'pending') {
      console.warn(`⚠️ [Transaction] Order status is ${order.status}, not pending`)
      return NextResponse.json(
        { error: 'Pesanan sudah diproses' },
        { status: 400 }
      )
    }

    // 3. Ambil data customer terpisah
    const { data: customer } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', order.customer_id)
      .single()

    // 4. Ambil data service terpisah
    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', order.service_id)
      .single()

    // 5. Parameter Midtrans
    const parameter = {
      transaction_details: {
        order_id: order.order_code,
        gross_amount: order.total_amount,
      },
      customer_details: {
        first_name: customer?.full_name || 'Customer',
        email: customer?.email || 'customer@email.com',
        phone: customer?.phone || '',
      },
      item_details: [
        {
          id: order.service_id,
          price: order.total_amount,
          quantity: 1,
          name: service?.name || 'Layanan Jasa',
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
      },
    }

    console.log('🔵 [Transaction] Creating Midtrans transaction...')

    // 6. Buat transaksi di Midtrans
    const transaction = await snap.createTransaction(parameter)
    console.log('✅ [Transaction] Midtrans transaction created:', transaction.token)

    // 7. Simpan token ke database
    await supabase
      .from('orders')
      .update({
        midtrans_token: transaction.token,
        midtrans_order_id: order.order_code,
        payment_method: 'midtrans',
      })
      .eq('id', order.id)

    console.log('✅ [Transaction] Token saved to database')

    // 8. Kembalikan token ke frontend
    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    })

  } catch (error) {
    console.error('❌ [Transaction] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memproses pembayaran: ' + (error as Error).message },
      { status: 500 }
    )
  }
}