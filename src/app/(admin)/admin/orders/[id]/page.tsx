import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah, formatDate } from '@/lib/utils'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge'

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Cek login admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // 2. Ambil data order (tanpa join)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (orderError || !order) {
    console.error('Order error:', orderError)
    notFound()
  }

  // 3. Ambil data customer (tanpa email, karena tidak ada di tabel profiles)
  const { data: customer, error: customerError } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', order.customer_id)
    .maybeSingle()

  if (customerError) {
    console.error('Customer error:', customerError)
  }

  // 4. Ambil data service
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('name, description, price, duration')
    .eq('id', order.service_id)
    .maybeSingle()

  if (serviceError) {
    console.error('Service error:', serviceError)
  }

  // Server actions
  const updateStatus = async (newStatus: string) => {
    'use server'
    const supabase = await createClient()
    const updateData: any = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    await supabase.from('orders').update(updateData).eq('id', id)
    redirect(`/admin/orders/${id}`)
  }

  const verifyPayment = async () => {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', id)
    redirect(`/admin/orders/${id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="text-sm mb-6">
          <Link href="/admin" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Dashboard Admin
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href="/admin/orders" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Semua Pesanan
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600 dark:text-gray-400">Detail</span>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detail Pesanan #{order.order_code}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Dibuat: {formatDate(order.created_at)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pelanggan</h2>
              <p className="text-gray-900 dark:text-white font-medium">{customer?.full_name || 'Unknown'}</p>
              {customer?.phone && <p className="text-sm text-gray-600 dark:text-gray-400">{customer.phone}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Layanan</h2>
                <p className="text-gray-900 dark:text-white">{service?.name}</p>
                {service?.description && <p className="text-sm text-gray-600 dark:text-gray-400">{service.description}</p>}
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Durasi</h2>
                <p className="text-gray-900 dark:text-white">{service?.duration || '-'} hari</p>
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
          {order.status === 'pending' && order.payment_method !== 'midtrans' && (
            <form action={verifyPayment}>
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                ✅ Verifikasi Pembayaran
              </button>
            </form>
          )}
          {order.status === 'paid' && (
            <form action={async () => { 'use server'; await updateStatus('processing') }}>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                ⏳ Proses Pesanan
              </button>
            </form>
          )}
          {order.status === 'processing' && (
            <form action={async () => { 'use server'; await updateStatus('completed') }}>
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                ✅ Selesaikan Pesanan
              </button>
            </form>
          )}
          {/* ✅ Perbaiki link chat admin */}
          <Link
            href={`/admin/chat/${order.id}`}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            💬 Chat dengan Customer
          </Link>
          <Link
            href="/admin/orders"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    </div>
  )
}