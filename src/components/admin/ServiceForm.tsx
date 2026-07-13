'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ServiceFormProps {
  service?: {
    id: string
    name: string
    description: string | null
    price: number
    duration: number
    is_active: boolean
    image_url?: string | null
  }
  isEditing?: boolean
}

export default function ServiceForm({ service, isEditing = false }: ServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '1',
    is_active: true,
    image_url: '',
  })

  // Isi form jika edit
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration: service.duration.toString(),
        is_active: service.is_active,
        image_url: service.image_url || '',
      })
    }
  }, [service])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validasi
    if (!formData.name.trim()) {
      setError('Nama jasa wajib diisi')
      setLoading(false)
      return
    }

    const priceNum = parseInt(formData.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Harga harus angka positif')
      setLoading(false)
      return
    }

    const durationNum = parseInt(formData.duration)
    if (isNaN(durationNum) || durationNum <= 0) {
      setError('Durasi harus angka positif')
      setLoading(false)
      return
    }

    try {
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing
        ? { id: service?.id, ...formData, price: priceNum, duration: durationNum }
        : { ...formData, price: priceNum, duration: durationNum }

      const response = await fetch('/api/admin/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan data')
      }

      // 🔥 Jika ada file gambar, upload setelah service tersimpan
      if (imageFile) {
        setUploadingImage(true)
        const uploadFormData = new FormData()
        uploadFormData.append('file', imageFile)
        uploadFormData.append('serviceId', data.id || service?.id || '')

        const uploadResponse = await fetch('/api/admin/services/upload-image', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) {
          console.error('Upload image failed:', uploadData.error)
          // Tapi service sudah tersimpan, kita tetap redirect dengan warning
        }
        setUploadingImage(false)
      }

      router.push('/admin/services')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {isEditing ? 'Edit Jasa' : 'Tambah Jasa Baru'}
      </h2>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      {uploadingImage && (
        <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-3 rounded-md mb-4 text-sm flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Mengupload gambar...
        </div>
      )}

      <div className="space-y-4">
        {/* Nama */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nama Jasa <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Contoh: Desain Logo"
            required
          />
        </div>

        {/* Deskripsi */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deskripsi
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Deskripsi layanan..."
          />
        </div>

        {/* Harga */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Harga (Rp) <span className="text-red-500">*</span>
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="1000"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="50000"
            required
          />
        </div>

        {/* Durasi */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Durasi Pengerjaan (hari)
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="3"
          />
        </div>

        {/* Gambar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gambar Jasa
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
          {formData.image_url && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Gambar saat ini:</p>
              <div className="relative w-32 h-32 rounded overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={formData.image_url}
                  alt="Current"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          {imageFile && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ✓ {imageFile.name} siap diupload
            </p>
          )}
        </div>

        {/* Status Aktif */}
        <div className="flex items-center">
          <input
            id="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Aktif (tampilkan di halaman customer)
          </label>
        </div>

        {/* Tombol */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Menyimpan...' : (isEditing ? 'Update' : 'Simpan')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/services')}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </form>
  )
}