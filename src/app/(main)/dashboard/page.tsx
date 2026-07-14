import { cache } from 'react' // ✅ Tambahkan import cache
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRupiah, formatDate, getOrderStatusText, getOrderStatusColor } from '@/lib/utils'

// ✅ Caching query untuk orders customer
const getCustomerOrders = cache(async (customerId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      services (
        name,
        price,
        duration
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  return { data, error }
})

const getCustomerProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()
  return { data, error }
})

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400">Silakan login terlebih dahulu</p>
          <Link href="/sign-in" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
            Login
          </Link>
        </div>
      </div>
    )
  }

  // 1. Ambil data profile (dengan cache)
  const { data: profile } = await getCustomerProfile(user.id)

  // 2. Ambil data orders (dengan cache)
  const { data: orders, error } = await getCustomerOrders(user.id)

  const totalOrders = orders?.length || 0
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0
  const totalSpent = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Halo, {profile?.full_name || 'Customer'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Selamat datang di dashboard Anda
          </p>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 p-6 transition-colors duration-200">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Pesanan</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 p-6 transition-colors duration-200">
            <p className="text-sm text-gray-500 dark:text-gray-400">Menunggu Pembayaran</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingOrders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 p-6 transition-colors duration-200">
            <p className="text-sm text-gray-500 dark:text-gray-400">Selesai</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedOrders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 p-6 transition-colors duration-200">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Belanja</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatRupiah(totalSpent)}</p>
          </div>
        </div>

        {/* Riwayat Pesanan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 overflow-hidden transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Riwayat Pesanan</h2>
          </div>

          {error ? (
            <div className="p-6 text-red-500 dark:text-red-400">Error: {error.message}</div>
          ) : orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Layanan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {order.order_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {order.services?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatRupiah(order.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Belum ada pesanan</p>
              <Link
                href="/"
                className="mt-3 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Lihat Layanan
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}