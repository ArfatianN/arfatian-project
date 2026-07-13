import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ChatBox from '@/components/chat/ChatBox'

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const supabase = await createClient()
  const { orderId } = await params

  // 1. Cek login admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // 2. Ambil order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Order not found:', orderId)
    notFound()
  }

  // 3. Cari customer, tapi jika tidak ada, tetap lanjutkan
  let customerId = order.customer_id
  const { data: customer } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', order.customer_id)
    .maybeSingle()

  if (customer) {
    customerId = customer.id
  } else {
    console.warn('Customer profile not found, using order.customer_id:', order.customer_id)
    // Tetap pakai ID dari order
  }

  // 4. Buat chat room jika belum ada
  const { data: existingRoom } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle()

  if (!existingRoom) {
    await supabase
      .from('chat_rooms')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        admin_id: user.id,
        last_message_at: new Date().toISOString(),
      })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link href={`/admin/orders/${orderId}`} className="text-blue-600 hover:underline text-sm">
          ← Kembali ke Detail Pesanan
        </Link>
      </div>
      <ChatBox
        orderId={orderId}
        currentUserId={user.id}
        otherUserId={customerId}
        currentUserRole="admin"
      />
    </div>
  )
}