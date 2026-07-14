import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { formatRupiah } from '@/lib/utils'
import ServiceCard from '@/components/ui/ServiceCard'

export const revalidate = 3600

const getServices = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return { data, error }
})

export default async function HomePage() {
  const { data: services, error } = await getServices()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/lilur-icon.png" alt="Lilur IT" width={32} height={32} className="h-8 w-auto" />
              <span className="font-bold text-xl text-gray-800 dark:text-white">Lilur IT</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/sign-in" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium">Masuk</Link>
              <Link href="/sign-up" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">Daftar</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Solusi Jasa Service Elektronik Terpercaya</h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">Temukan teknisi profesional untuk berbagai kebutuhan perbaikan dan perawatan perangkat elektronik Anda.</p>
          <div className="mt-6">
            <Link href="/sign-up" className="bg-white text-blue-600 px-8 py-3 rounded-md font-semibold hover:bg-blue-50 transition-colors inline-block">Mulai Sekarang</Link>
          </div>
        </div>
      </section>

      {/* Daftar Jasa */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Layanan Kami</h2>
        {error ? (
          <div className="text-center py-12 text-red-500">Error: {error.message}</div>
        ) : services && services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} priority={index === 0} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Belum ada layanan tersedia</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Lilur IT. All rights reserved.
        </div>
      </footer>
    </div>
  )
}