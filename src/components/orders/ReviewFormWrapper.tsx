'use client'

import dynamic from 'next/dynamic'

// ✅ Dynamic import ReviewForm (di Client Component)
const ReviewForm = dynamic(() => import('@/components/orders/ReviewForm'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-32">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Memuat form review...</p>
      </div>
    </div>
  ),
})

interface ReviewFormWrapperProps {
  orderId: string
  serviceId: string
}

export default function ReviewFormWrapper(props: ReviewFormWrapperProps) {
  return <ReviewForm {...props} />
}