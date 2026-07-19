'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ReviewForm({ orderId, serviceId }: { orderId: string, serviceId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Harap login')

      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          customer_id: user.id,
          service_id: serviceId,
          rating,
          comment: comment.trim() || null,
        })

      if (error) throw error

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Berikan Ulasan</h3>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Rating
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= rating
            return (
              <button
                key={star}
                type="button"
                onClick={() => {
                  console.log('⭐ Bintang diklik:', star) // <- Debug
                  setRating(star)
                }}
                className="text-3xl hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                style={{
                  color: isActive ? '#facc15' : '#d1d5db',
                  textShadow: isActive ? '0 0 8px rgba(250, 204, 21, 0.5)' : 'none',
                }}
              >
                ★
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Rating: {rating} dari 5 bintang
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Komentar (opsional)
        </label>
        <textarea
          id="comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Bagikan pengalaman Anda..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
      >
        {submitting ? 'Menyimpan...' : 'Kirim Ulasan'}
      </button>
    </form>
  )
}