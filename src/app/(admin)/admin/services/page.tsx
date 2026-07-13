import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ServiceTable from '@/components/admin/ServiceTable'

export default async function AdminServicesPage() {
  const supabase = await createClient()

  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          Error: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Jasa</h1>
        <Link
          href="/admin/services/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Tambah Jasa
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ServiceTable services={services || []} />
      </div>
    </div>
  )
}