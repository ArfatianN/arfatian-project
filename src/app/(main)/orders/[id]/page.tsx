import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { formatRupiah, formatDate } from '@/lib/utils'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'

// ✅ Perbaiki: dynamic import dengan benar
const ChatBox = dynamic(
  () => import('@/components/chat/ChatBox'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Memuat chat...</p>
        </div>
      </div>
    ),
  }
)

const ReviewForm = dynamic(
  () => import('@/components/orders/ReviewForm'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-32">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Memuat form review...</p>
        </div>
      </div>
    ),
  }
)

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Cek login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/sign-in')
  }

  // 2. Ambil data order
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      services (
        name,
        description,
        price,
        duration
      ),
      profiles!customer_id (
        full_name,
        phone
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !order) {
    console.error('Order not found:', id, error)
    notFound()
  }

  // 3. Cek kepemilikan
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = order.customer_id === user.id

  if (!isAdmin && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Anda tidak memiliki akses ke pesanan ini.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // 4. Cek review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle()

  const hasReview = !!existingReview

  // 5. Cek chat room
  const { data: chatRoom } = await supabase
    .from('chat_rooms')
    .select('id, admin_id')
    .eq('order_id', order.id)
    .maybeSingle()

  let adminId = null
  if (chatRoom) {
    adminId = chatRoom.admin_id
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="text-sm mb-6">
          <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Dashboard
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600 dark:text-gray-400">Detail Pesanan</span>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detail Pesanan</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Kode: <span className="font-mono font-medium text-gray-900 dark:text-white">{order.order_code}</span>
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pelanggan</h2>
              <p className="text-gray-900 dark:text-white">{order.profiles?.full_name || 'Unknown'}</p>
              {order.profiles?.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{order.profiles.phone}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Layanan</h2>
                <p className="text-gray-900 dark:text-white">{order.services?.name}</p>
                {order.services?.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.services.description}</p>
                )}
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Durasi</h2>
                <p className="text-gray-900 dark:text-white">{order.services?.duration || '-'} hari</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Harga</h2>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatRupiah(order.total_amount)}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Metode Pembayaran</h2>
                <p className="text-gray-900 dark:text-white capitalize">{order.payment_method || 'Midtrans'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dibuat</h2>
                <p className="text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</p>
              </div>
              {order.paid_at && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dibayar</h2>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(order.paid_at)}</p>
                </div>
              )}
              {order.completed_at && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Selesai</h2>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(order.completed_at)}</p>
                </div>
              )}
            </div>

            {order.payment_proof_url && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bukti Transfer</h2>
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Lihat Bukti
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {chatRoom && adminId ? (
            <ChatBox
              orderId={order.id}
              currentUserId={user.id}
              otherUserId={adminId}
              currentUserRole="customer"
            />
          ) : (
            <span className="text-gray-400 text-sm">Chat tidak tersedia</span>
          )}

          {!isAdmin && order.status === 'completed' && !hasReview && (
            <ReviewForm orderId={order.id} serviceId={order.service_id} />
          )}

          <Link
            href="/dashboard"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}