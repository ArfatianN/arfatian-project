import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboardContent from '@/components/admin/AdminDashboardContent'

export default async function AdminDashboard() {
  // 1. Cek login & role admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminName = profile?.full_name || 'Admin'

  // 2. Ambil semua orders
  const { data: ordersData, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('Error fetching orders:', ordersError)
    return (
      <div className="p-8 text-red-500">
        <h2>Error mengambil data pesanan</h2>
        <pre>{JSON.stringify(ordersError, null, 2)}</pre>
      </div>
    )
  }

  // 3. Jika tidak ada data
  if (!ordersData || ordersData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard Admin</h1>
          <p className="text-gray-500">Belum ada pesanan</p>
        </div>
      </div>
    )
  }

  // 4. Ambil data customer (profiles) - HANYA full_name, TANPA email
  let customerMap: Record<string, { full_name: string }> = {}
  try {
    const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))]
    if (customerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')  // ✅ HAPUS email
        .in('id', customerIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else if (profiles) {
        customerMap = profiles.reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name || 'Unknown' }
          return acc
        }, {} as Record<string, { full_name: string }>)
      }
    }
  } catch (err) {
    console.error('Unexpected error fetching profiles:', err)
  }

  // 5. Ambil data service (services)
  let serviceMap: Record<string, { name: string }> = {}
  try {
    const serviceIds = [...new Set(ordersData.map(o => o.service_id).filter(Boolean))]
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabaseAdmin
        .from('services')
        .select('id, name')
        .in('id', serviceIds)

      if (servicesError) {
        console.error('Error fetching services:', servicesError)
      } else if (services) {
        serviceMap = services.reduce((acc, s) => {
          acc[s.id] = { name: s.name || 'Unknown' }
          return acc
        }, {} as Record<string, { name: string }>)
      }
    }
  } catch (err) {
    console.error('Unexpected error fetching services:', err)
  }

  // 6. Gabungkan data
  const orders = ordersData.map(order => ({
    ...order,
    customer: customerMap[order.customer_id] || { full_name: 'Unknown' },
    services: serviceMap[order.service_id] || { name: 'Unknown' },
  }))

  // 7. Statistik
  const totalOrders = orders.length
  const pending = orders.filter(o => o.status === 'pending').length
  const paid = orders.filter(o => o.status === 'paid').length
  const processing = orders.filter(o => o.status === 'processing').length
  const completed = orders.filter(o => o.status === 'completed').length
  const cancelled = orders.filter(o => o.status === 'cancelled').length

  // Pendapatan hanya dari yang sudah diverifikasi
  const verifiedOrders = orders.filter(o => 
    (o.status === 'paid' || o.status === 'processing' || o.status === 'completed') &&
    (o.payment_method === 'midtrans' || o.verified_by !== null)
  )
  const totalRevenue = verifiedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  const stats = {
    totalOrders,
    totalRevenue,
    pending,
    paid,
    processing,
    completed,
    cancelled,
    verifiedCount: verifiedOrders.length,
  }

  // 8. Grafik pendapatan per bulan (hanya verified)
  const monthMap: Record<string, number> = {}
  verifiedOrders.forEach(o => {
    const date = new Date(o.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthMap[key] = (monthMap[key] || 0) + o.total_amount
  })
  const sortedMonths = Object.keys(monthMap).sort()
  const monthlyData = {
    labels: sortedMonths.length > 0 
      ? sortedMonths.map(m => {
          const [year, month] = m.split('-')
          return `${month}/${year.slice(2)}`
        })
      : ['Belum Ada Data'],
    datasets: [
      {
        label: 'Pendapatan Dikonfirmasi',
        data: sortedMonths.length > 0 
          ? sortedMonths.map(m => monthMap[m]) 
          : [0],
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  }

  // 9. Data status (doughnut)
  const statusData = {
    labels: ['Pending', 'Paid', 'Processing', 'Completed', 'Cancelled'],
    datasets: [
      {
        data: [pending, paid, processing, completed, cancelled],
        backgroundColor: [
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(234, 179, 8, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  // 10. Render komponen client
  return (
    <AdminDashboardContent
      orders={orders}
      adminName={adminName}
      stats={stats}
      monthlyData={monthlyData}
      statusData={statusData}
    />
  )
}