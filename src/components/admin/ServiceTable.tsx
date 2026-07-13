'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  is_active: boolean
  image_url?: string | null
  created_at: string
}

export default function ServiceTable({ services }: { services: Service[] }) {
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jasa ini?')) return

    try {
      const response = await fetch(`/api/admin/services?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const text = await response.text()
        let errorMsg = 'Gagal menghapus'
        try {
          const json = JSON.parse(text)
          errorMsg = json.error || errorMsg
        } catch {
          errorMsg = text || errorMsg
        }
        throw new Error(errorMsg)
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Belum ada jasa</p>
        <Link
          href="/admin/services/new"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          + Tambah Jasa
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gambar
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nama
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Harga
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Durasi
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {services.map((service) => (
            <tr key={service.id} className="hover:bg-gray-50">
              {/* Gambar */}
              <td className="px-4 py-4 whitespace-nowrap">
                {service.image_url ? (
                  <div className="relative w-12 h-12 rounded-md overflow-hidden">
                    <Image
                      src={service.image_url}
                      alt={service.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs">
                    No img
                  </div>
                )}
              </td>

              {/* Nama & Deskripsi */}
              <td className="px-4 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {service.name}
                </div>
                {service.description && (
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {service.description}
                  </div>
                )}
              </td>

              {/* Harga */}
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatRupiah(service.price)}
              </td>

              {/* Durasi */}
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {service.duration} hari
              </td>

              {/* Status */}
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  service.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {service.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>

              {/* Aksi */}
              <td className="px-4 py-4 whitespace-nowrap text-sm">
                <div className="flex space-x-3">
                  <Link
                    href={`/admin/services/${service.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}