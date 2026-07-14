import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ChatBoxWrapper from '@/components/chat/ChatBoxWrapper'

export default async function CustomerChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const supabase = await createClient()
  const { orderId } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/sign-in')
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('customer_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Order not found:', orderId)
    notFound()
  }

  if (order.customer_id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Anda tidak memiliki akses ke chat ini.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { data: admin, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .maybeSingle()

  if (adminError || !admin) {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('admin_id')
      .eq('order_id', orderId)
      .maybeSingle()
    if (room) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Link href={`/orders/${orderId}`} className="text-blue-600 hover:underline text-sm">
              ← Kembali ke Detail Pesanan
            </Link>
          </div>
          <ChatBoxWrapper
            orderId={orderId}
            currentUserId={user.id}
            otherUserId={room.admin_id}
            currentUserRole="customer"
          />
        </div>
      )
    } else {
      return (
        <div className="p-8 text-center">
          <p className="text-red-500">Admin belum tersedia, silakan hubungi dukungan.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            Kembali
          </Link>
        </div>
      )
    }
  }

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
        customer_id: user.id,
        admin_id: admin.id,
        last_message_at: new Date().toISOString(),
      })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link href={`/orders/${orderId}`} className="text-blue-600 hover:underline text-sm">
          ← Kembali ke Detail Pesanan
        </Link>
      </div>
      <ChatBoxWrapper
        orderId={orderId}
        currentUserId={user.id}
        otherUserId={admin.id}
        currentUserRole="customer"
      />
    </div>
  )
}