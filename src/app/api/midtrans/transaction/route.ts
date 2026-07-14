import { createClient } from '@/lib/supabase/server'
import { snap } from '@/lib/midtrans'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId wajib diisi' },
        { status: 400 }
      )
    }

    // 🔥 AMBIL ORDER TANPA JOIN (lebih aman)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderError)
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Pesanan sudah diproses' },
        { status: 400 }
      )
    }

    // 🔥 Ambil data customer terpisah
    const { data: customer } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', order.customer_id)
      .single()

    // 🔥 Ambil data service terpisah
    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', order.service_id)
      .single()

    // Parameter Midtrans
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

    const transaction = await snap.createTransaction(parameter)

    await supabase
      .from('orders')
      .update({
        midtrans_token: transaction.token,
        midtrans_order_id: order.order_code,
        payment_method: 'midtrans',
      })
      .eq('id', order.id)

    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    })

  } catch (error) {
    console.error('Midtrans Error:', error)
    return NextResponse.json(
      { error: 'Gagal memproses pembayaran: ' + (error as Error).message },
      { status: 500 }
    )
  }
}