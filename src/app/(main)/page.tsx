import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRupiah } from '@/lib/utils'
import ServiceCard from '@/components/ui/ServiceCard'

export default async function ServicesPage() {
  const supabase = await createClient()

  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Layanan Kami
        </h1>

        {error ? (
          <div className="text-center py-12 text-red-500">Error: {error.message}</div>
        ) : services && services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Belum ada layanan tersedia</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              (Pastikan admin sudah menambahkan jasa dan mengaktifkannya)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}