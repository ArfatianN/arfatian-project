import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRupiah, formatDate, getOrderStatusText, getOrderStatusColor } from '@/lib/utils'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()

  // 1. Ambil parameter filter status
  const statusFilter = searchParams.status || 'semua'

  // 2. Query orders dengan filter status
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (statusFilter !== 'semua') {
    query = query.eq('status', statusFilter)
  }

  const { data: orders, error } = await query

  // 3. Kumpulkan customer_id unik
  const customerIds = [...new Set(orders?.map(o => o.customer_id).filter(Boolean) || [])]

  // 4. Ambil data customer
  let customerMap: Record<string, { full_name: string; email: string }> = {}
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', customerIds)

    if (customers) {
      customerMap = customers.reduce((acc, c) => {
        acc[c.id] = { full_name: c.full_name || 'Unknown', email: c.email || '' }
        return acc
      }, {} as Record<string, { full_name: string; email: string }>)
    }
  }

  // 5. Gabungkan data
  const ordersWithCustomer = orders?.map(order => ({
    ...order,
    customer: customerMap[order.customer_id] || { full_name: 'Unknown', email: '' }
  })) || []

  // 6. Statistik
  const totalOrders = ordersWithCustomer.length
  const statusCounts = {
    semua: totalOrders,
    pending: ordersWithCustomer.filter(o => o.status === 'pending').length,
    paid: ordersWithCustomer.filter(o => o.status === 'paid').length,
    processing: ordersWithCustomer.filter(o => o.status === 'processing').length,
    completed: ordersWithCustomer.filter(o => o.status === 'completed').length,
    cancelled: ordersWithCustomer.filter(o => o.status === 'cancelled').length,
  }

  const statusOptions = [
    { label: 'Semua', value: 'semua' },
    { label: 'Pending', value: 'pending' },
    { label: 'Dibayar', value: 'paid' },
    { label: 'Diproses', value: 'processing' },
    { label: 'Selesai', value: 'completed' },
    { label: 'Dibatalkan', value: 'cancelled' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Semua Pesanan</h1>
            <p className="text-gray-600 mt-1">Kelola semua pesanan dari customer</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-900">{statusCounts.semua}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-bold text-yellow-600">{statusCounts.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Dibayar</p>
            <p className="text-lg font-bold text-blue-600">{statusCounts.paid}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Diproses</p>
            <p className="text-lg font-bold text-purple-600">{statusCounts.processing}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Selesai</p>
            <p className="text-lg font-bold text-green-600">{statusCounts.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Batal</p>
            <p className="text-lg font-bold text-red-600">{statusCounts.cancelled}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200 overflow-x-auto">
            <div className="flex space-x-2">
              {statusOptions.map((opt) => {
                const isActive = statusFilter === opt.value
                const count = statusCounts[opt.value as keyof typeof statusCounts] || 0
                return (
                  <Link
                    key={opt.value}
                    href={`/admin/orders?status=${opt.value}`}
                    className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label} ({count})
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabel */}
        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">Error: {error.message}</div>
        ) : ordersWithCustomer.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ordersWithCustomer.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {order.order_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer.full_name}
                        <div className="text-xs text-gray-400">{order.customer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatRupiah(order.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.payment_method || 'midtrans'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Belum ada pesanan</p>
          </div>
        )}
      </div>
    </div>
  )
}