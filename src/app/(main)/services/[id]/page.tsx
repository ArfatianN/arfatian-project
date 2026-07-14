import { cache } from 'react' // ✅ Tambahkan import cache
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatRupiah, formatDate } from '@/lib/utils'

// ✅ ISR: Revalidate setiap 1 jam
export const revalidate = 3600

// ✅ Caching query untuk service
const getService = cache(async (id: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
})

// ✅ Caching query untuk reviews
const getReviews = cache(async (serviceId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles!customer_id (
        full_name
      )
    `)
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })
  return { data, error }
})

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Ambil data jasa (dengan cache)
  const { data: service, error: serviceError } = await getService(id)

  if (serviceError || !service) {
    console.error('Service not found:', id, serviceError)
    notFound()
  }

  // 2. Ambil review untuk jasa ini (dengan cache)
  const { data: reviews, error: reviewsError } = await getReviews(id)

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError)
  }

  // 3. Hitung rata-rata rating
  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // 4. Fungsi untuk membuat order (server action)
  const handleOrder = async () => {
    'use server'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/sign-in')
    }

    const orderCode = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_id: user.id,
        service_id: service.id,
        quantity: 1,
        total_amount: service.price,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw new Error('Gagal membuat pesanan: ' + error.message)
    }

    // Buat chat room
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (admin) {
      await supabase
        .from('chat_rooms')
        .insert({
          order_id: order.id,
          customer_id: user.id,
          admin_id: admin.id,
        })
    }

    redirect(`/checkout/${order.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6">
          <Link href="/services" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Layanan
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600 dark:text-gray-400">{service.name}</span>
        </nav>

        {/* Detail Jasa */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {service.image_url && (
            <div className="relative w-full h-80 bg-gray-200 dark:bg-gray-700">
              <Image
                src={service.image_url}
                alt={service.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {service.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center">
                {averageRating ? (
                  <>
                    <span className="text-yellow-400 text-xl">★</span>
                    <span className="ml-1 font-semibold text-gray-900 dark:text-white">{averageRating}</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400">({reviews?.length || 0} ulasan)</span>
                  </>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Belum ada ulasan</span>
                )}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ⏱ {service.duration} hari pengerjaan
              </span>
            </div>

            <div className="prose max-w-none mb-6 dark:prose-invert">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {service.description || 'Tidak ada deskripsi'}
              </p>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Harga</span>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatRupiah(service.price)}
                </p>
              </div>
              <form action={handleOrder}>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold"
                >
                  Pesan Sekarang
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Review Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ulasan Pelanggan
            </h2>
            
            {reviews && reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {review.profiles?.full_name || 'Anonim'}
                        </p>
                        <div className="flex items-center mt-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-gray-600 dark:text-gray-400">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Belum ada ulasan untuk layanan ini</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}