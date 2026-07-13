'use client'

import { useEffect, useRef } from 'react'
import { formatDate } from '@/lib/utils'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  profiles?: {
    full_name: string
  }
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  isLoading?: boolean
}

export default function MessageList({ messages, currentUserId, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Memuat pesan...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500 text-center">
          <p className="text-lg">Belum ada pesan</p>
          <p className="text-sm">Mulai percakapan!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
      {messages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId
        return (
          <div
            key={msg.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              {!isOwn && (
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {msg.profiles?.full_name || 'Unknown'}
                </p>
              )}
              <p className="text-sm break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatDate(msg.created_at)}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}