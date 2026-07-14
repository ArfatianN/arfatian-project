import { createClient } from '@/lib/supabase/server'
import { snap } from '@/lib/midtrans'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId wajib diisi' }, { status: 400 })
    }

    // Ambil data order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!customer_id (
          email,
          full_name,
          phone
        ),
        services (
          name,
          price
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderError)
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Pesanan sudah diproses' },
        { status: 400 }
      )
    }

    // Parameter Midtrans
    const parameter = {
      transaction_details: {
        order_id: order.order_code,
        gross_amount: order.total_amount,
      },
      customer_details: {
        first_name: order.profiles?.full_name || 'Customer',
        email: order.profiles?.email || 'customer@email.com',
        phone: order.profiles?.phone || '',
      },
      item_details: [
        {
          id: order.service_id,
          price: order.total_amount,
          quantity: 1,
          name: order.services?.name || 'Layanan Jasa',
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
      },
    }

    const transaction = await snap.createTransaction(parameter)
    console.log('✅ Midtrans transaction created:', transaction)

    // Simpan token
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