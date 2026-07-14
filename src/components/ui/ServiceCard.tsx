import Link from 'next/link'
import Image from 'next/image'
import { formatRupiah } from '@/lib/utils'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  is_active: boolean
  image_url?: string | null
}

interface ServiceCardProps {
  service: Service
  priority?: boolean // ✅ Tambahkan prop untuk priority
}

export default function ServiceCard({ service, priority = false }: ServiceCardProps) {
  // Jika service tidak valid, return null
  if (!service || !service.id) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {/* Gambar */}
      {service.image_url ? (
        <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700">
          <Image
            src={service.image_url}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority} // ✅ Gunakan prop priority
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-blue-400 dark:text-gray-400">
          <span className="text-4xl">🖼️</span>
        </div>
      )}

      {/* Konten */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
          {service.name || 'Tanpa Nama'}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-grow">
          {service.description || 'Tidak ada deskripsi'}
        </p>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {formatRupiah(service.price || 0)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ⏱ {service.duration || 0} hari
          </span>
        </div>

        <Link
          href={`/services/${service.id}`}
          className="block w-full text-center bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200 text-sm font-medium"
        >
          Lihat Detail
        </Link>
      </div>
    </div>
  )
}