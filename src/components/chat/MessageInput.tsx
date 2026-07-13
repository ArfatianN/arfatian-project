'use client'

import { useState } from 'react'

interface MessageInputProps {
  onSend: (content: string) => Promise<void>
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending || disabled) return

    setSending(true)
    try {
      await onSend(message.trim())
      setMessage('')
    } catch (error) {
      console.error('Gagal kirim pesan:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ketik pesan..."
        disabled={disabled || sending}
        className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600"
      />
      <button
        type="submit"
        disabled={disabled || sending || !message.trim()}
        className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {sending ? '...' : 'Kirim'}
      </button>
    </form>
  )
}