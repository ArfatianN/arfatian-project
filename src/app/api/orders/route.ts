import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateOrderCode } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { serviceId, quantity = 1 } = body

    // 1. Validasi input
    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId wajib diisi' },
        { status: 400 }
      )
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity minimal 1' },
        { status: 400 }
      )
    }

    // 2. Cek login
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Harap login terlebih dahulu' },
        { status: 401 }
      )
    }

    // 3. Ambil data service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, duration, is_active')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Layanan tidak ditemukan' },
        { status: 404 }
      )
    }

    // 4. Cek apakah service aktif
    if (!service.is_active) {
      return NextResponse.json(
        { error: 'Layanan sedang tidak tersedia' },
        { status: 400 }
      )
    }

    // 5. Hitung total harga
    const totalAmount = service.price * quantity

    // 6. Generate kode order unik
    const orderCode = generateOrderCode()

    // 7. Buat order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_id: user.id,
        service_id: serviceId,
        quantity,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Gagal membuat pesanan: ' + orderError.message },
        { status: 500 }
      )
    }

    // 8. Buat chat room untuk order ini
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()

    if (admin) {
      const { error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          order_id: order.id,
          customer_id: user.id,
          admin_id: admin.id,
          last_message_at: new Date().toISOString(),
        })

      if (roomError) {
        console.error('Chat room creation error:', roomError)
        // Tidak perlu gagalkan order, chat room bisa dibuat nanti
      }
    } else {
      console.warn('No admin found, chat room not created')
    }

    // 9. Kirim notifikasi email (opsional)
    try {
      // Ambil email dan full_name customer
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')  // ✅ Perbaiki: tambahkan full_name
        .eq('id', user.id)
        .single()

      if (profile?.email) {
        const customerName = profile.full_name || 'Pelanggan'
        
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: profile.email,
            subject: '✅ Pesanan Berhasil Dibuat - Lilur IT',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                  .order-detail { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
                  .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🛒 Pesanan Berhasil Dibuat</h1>
                  </div>
                  <div class="content">
                    <p>Halo <strong>${customerName}</strong>,</p>
                    <p>Pesanan Anda telah berhasil dibuat dengan detail berikut:</p>
                    <div class="order-detail">
                      <p><strong>Kode Pesanan:</strong> ${orderCode}</p>
                      <p><strong>Layanan:</strong> ${service.name}</p>
                      <p><strong>Jumlah:</strong> ${quantity}</p>
                      <p><strong>Total Harga:</strong> Rp ${totalAmount.toLocaleString('id-ID')}</p>
                      <p><strong>Status:</strong> Menunggu Pembayaran</p>
                    </div>
                    <p>Silakan selesaikan pembayaran Anda melalui halaman checkout.</p>
                    <p style="text-align: center; margin-top: 20px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout/${order.id}" class="button">
                        Lanjutkan ke Pembayaran
                      </a>
                    </p>
                    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                      Atau salin link ini ke browser Anda:<br>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout/${order.id}" style="color: #2563eb; word-break: break-all;">
                        ${process.env.NEXT_PUBLIC_APP_URL}/checkout/${order.id}
                      </a>
                    </p>
                  </div>
                  <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Lilur IT. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        })

        if (!emailResponse.ok) {
          console.warn('Email not sent:', await emailResponse.text())
        }
      }
    } catch (emailError) {
      console.warn('Email notification error:', emailError)
    }

    // 10. Return response
    return NextResponse.json({
      message: 'Pesanan berhasil dibuat',
      order,
      redirect_url: `/checkout/${order.id}`,
    }, { status: 201 })

  } catch (error) {
    console.error('Order API error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}