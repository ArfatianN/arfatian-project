import { cache } from 'react' // ✅ Tambahkan import cache
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ServiceTable from '@/components/admin/ServiceTable'

// ✅ ISR: Revalidate setiap 1 jam (3600 detik)
export const revalidate = 3600

// ✅ Caching query untuk services (admin melihat semua, tanpa filter is_active)
const getServices = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
})

export default async function AdminServicesPage() {
  const { data: services, error } = await getServices()

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md">
          Error: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola Jasa</h1>
        <Link
          href="/admin/services/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Tambah Jasa
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-800/50 overflow-hidden">
        <ServiceTable services={services || []} />
      </div>
    </div>
  )
}