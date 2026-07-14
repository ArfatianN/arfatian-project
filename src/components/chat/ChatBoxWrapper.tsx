'use client'

import dynamic from 'next/dynamic'

// ✅ Dynamic import ChatBox (di Client Component)
const ChatBox = dynamic(() => import('@/components/chat/ChatBox'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Memuat chat...</p>
      </div>
    </div>
  ),
})

interface ChatBoxWrapperProps {
  orderId: string
  currentUserId: string
  otherUserId: string
  currentUserRole: 'admin' | 'customer'
}

export default function ChatBoxWrapper(props: ChatBoxWrapperProps) {
  return <ChatBox {...props} />
}