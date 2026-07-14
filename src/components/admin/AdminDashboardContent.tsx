'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, getOrderStatusText, getOrderStatusColor } from '@/lib/utils'
import AdminCharts from './AdminCharts'

interface Order {
  id: string
  order_code: string
  customer_id: string
  service_id: string
  total_amount: number
  status: string
  payment_method: string
  verified_by: string | null
  created_at: string
  paid_at: string | null
  completed_at: string | null
  customer?: { full_name: string }
  services?: { name: string }
}

interface AdminDashboardContentProps {
  orders: Order[]
  adminName: string
  stats: {
    totalOrders: number
    totalRevenue: number
    pending: number
    paid: number
    processing: number
    completed: number
    cancelled: number
    verifiedCount: number
  }
  monthlyData: any
  statusData: any
}

export default function AdminDashboardContent({
  orders,
  adminName,
  stats,
  monthlyData,
  statusData,
}: AdminDashboardContentProps) {
  const supabase = createClient()
  const [loadingVerify, setLoadingVerify] = useState<string | null>(null)

  const handleVerify = async (orderId: string) => {
    if (!confirm('Verifikasi pembayaran ini?')) return
    setLoadingVerify(orderId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Harap login ulang')
      setLoadingVerify(null)
      return
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) {
      alert('Gagal verifikasi: ' + error.message)
    } else {
      window.location.reload()
    }
    setLoadingVerify(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Admin</h1>
            <p className="text-gray-600 dark:text-gray-400">Halo, {adminName}!</p>
          </div>
          <Link
            href="/admin/services"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + Kelola Jasa
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Pesanan</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800/50 border-2 border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">💰 Pendapatan Dikonfirmasi</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatRupiah(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.verifiedCount} pesanan dikonfirmasi</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">Selesai</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </div>

        {/* Charts */}
        <AdminCharts monthlyData={monthlyData} statusData={statusData} />

        {/* Daftar Pesanan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Semua Pesanan</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{stats.totalOrders} pesanan</span>
          </div>

          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pelanggan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Layanan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Verifikasi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => {
                    const needsVerification = order.status === 'pending' && 
                      (order.payment_method === 'cash' || order.payment_method === 'bank_transfer')
                    
                    const isVerified = order.verified_by !== null

                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {order.order_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.customer?.full_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.services?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                          {formatRupiah(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {order.payment_method || 'midtrans'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isVerified ? (
                            <span className="text-green-600 dark:text-green-400">✅ Diverifikasi</span>
                          ) : order.payment_method === 'midtrans' && order.status === 'paid' ? (
                            <span className="text-blue-600 dark:text-blue-400">✅ Otomatis</span>
                          ) : (
                            <span className="text-gray-400">⏳ Belum</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              Detail
                            </Link>
                            {needsVerification && (
                              <button
                                onClick={() => handleVerify(order.id)}
                                disabled={loadingVerify === order.id}
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-medium disabled:opacity-50"
                              >
                                {loadingVerify === order.id ? 'Memproses...' : 'Verifikasi'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Belum ada pesanan</div>
          )}
        </div>
      </div>
    </div>
  )
}