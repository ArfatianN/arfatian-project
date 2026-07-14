import { cache } from 'react' // ✅ Tambahkan import cache
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRupiah, formatDate, getOrderStatusText, getOrderStatusColor } from '@/lib/utils'

// ✅ Halaman dinamis (karena user-specific dan searchParams)
export const dynamic = 'force-dynamic'

// ✅ Caching query orders berdasarkan user dan status filter
const getOrders = cache(async (userId: string, statusFilter: string) => {
  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select(`
      *,
      services (
        name,
        price,
        duration
      )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'semua') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  return { data, error }
})

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }> // ✅ searchParams adalah Promise
}) {
  const supabase = await createClient()

  // 1. Cek login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Silakan login terlebih dahulu</p>
          <Link href="/sign-in" className="text-blue-600 hover:underline mt-2 inline-block">
            Login
          </Link>
        </div>
      </div>
    )
  }

  // 2. Ambil parameter filter status dari URL (await karena Promise)
  const { status = 'semua' } = await searchParams
  const statusFilter = status

  // 3. Query orders dengan cache
  const { data: orders, error } = await getOrders(user.id, statusFilter)

  // 4. Statistik
  const totalOrders = orders?.length || 0
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0
  const paidCount = orders?.filter(o => o.status === 'paid').length || 0
  const processingCount = orders?.filter(o => o.status === 'processing').length || 0
  const completedCount = orders?.filter(o => o.status === 'completed').length || 0
  const cancelledCount = orders?.filter(o => o.status === 'cancelled').length || 0

  // 5. Data filter untuk badge
  const statusCounts = {
    semua: totalOrders,
    pending: pendingCount,
    paid: paidCount,
    processing: processingCount,
    completed: completedCount,
    cancelled: cancelledCount,
  }

  // Definisi status untuk filter
  const statusOptions = [
    { label: 'Semua', value: 'semua' },
    { label: 'Menunggu Pembayaran', value: 'pending' },
    { label: 'Sudah Dibayar', value: 'paid' },
    { label: 'Diproses', value: 'processing' },
    { label: 'Selesai', value: 'completed' },
    { label: 'Dibatalkan', value: 'cancelled' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pesanan Saya</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola semua pesanan Anda di sini</p>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalOrders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Dibayar</p>
            <p className="text-lg font-bold text-blue-600">{paidCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Diproses</p>
            <p className="text-lg font-bold text-purple-600">{processingCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Selesai</p>
            <p className="text-lg font-bold text-green-600">{completedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Batal</p>
            <p className="text-lg font-bold text-red-600">{cancelledCount}</p>
          </div>
        </div>

        {/* Filter Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex space-x-2">
              {statusOptions.map((opt) => {
                const isActive = statusFilter === opt.value
                const count = statusCounts[opt.value as keyof typeof statusCounts] || 0
                return (
                  <Link
                    key={opt.value}
                    href={`/orders?status=${opt.value}`}
                    className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {opt.label} ({count})
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Daftar Pesanan */}
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md">
            Error: {error.message}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                          #{order.order_code}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                        {order.services?.name || 'Layanan tidak diketahui'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatRupiah(order.total_amount)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {order.payment_method || 'Midtrans'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>⏱ {order.services?.duration || '-'} hari</span>
                      {order.paid_at && (
                        <span>✅ Dibayar {formatDate(order.paid_at)}</span>
                      )}
                    </div>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
                    >
                      Lihat Detail →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Belum ada pesanan</p>
            <Link
              href="/"
              className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Lihat Layanan
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}