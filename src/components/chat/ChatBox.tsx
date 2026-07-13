'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

interface ChatBoxProps {
  orderId: string
  currentUserId: string
  otherUserId: string
  currentUserRole: 'admin' | 'customer'
}

export default function ChatBox({ orderId, currentUserId, otherUserId, currentUserRole }: ChatBoxProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roomId, setRoomId] = useState<string | null>(null)

  // 1. Ambil room chat
  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle()

      if (error) {
        console.error('Error fetch room:', error)
        setLoading(false)
        return
      }

      if (data) {
        setRoomId(data.id)
        loadMessages(data.id)
      } else {
        console.warn('Chat room not found for order:', orderId)
        setLoading(false)
      }
    }

    fetchRoom()
  }, [orderId])

  // 2. Load messages dengan manual mapping nama
  const loadMessages = async (roomId: string) => {
    setLoading(true)
    try {
      // Ambil messages
      const { data: messagesData, error: messagesError } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error load messages:', messagesError)
        setMessages([])
        setLoading(false)
        return
      }

      if (!messagesData || messagesData.length === 0) {
        setMessages([])
        setLoading(false)
        return
      }

      // Kumpulkan semua sender_id unik
      const senderIds = [...new Set(messagesData.map((msg: any) => msg.sender_id))]

      // Ambil nama dari profiles untuk semua sender_id
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds)

      if (profilesError) {
        console.error('Error load profiles:', profilesError)
        // Fallback: pakai supabase biasa
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds)
        if (fallbackProfiles) {
          const nameMap = Object.fromEntries(fallbackProfiles.map((p: any) => [p.id, p.full_name]))
          const enriched = messagesData.map((msg: any) => ({
            ...msg,
            profiles: { full_name: nameMap[msg.sender_id] || 'Unknown' }
          }))
          setMessages(enriched)
          setLoading(false)
          return
        }
        setMessages(messagesData.map((msg: any) => ({
          ...msg,
          profiles: { full_name: 'Unknown' }
        })))
        setLoading(false)
        return
      }

      // Buat map id -> full_name
      const nameMap = Object.fromEntries(profilesData.map((p: any) => [p.id, p.full_name]))

      // Enrich messages dengan nama
      const enrichedMessages = messagesData.map((msg: any) => ({
        ...msg,
        profiles: { full_name: nameMap[msg.sender_id] || 'Unknown' }
      }))

      setMessages(enrichedMessages)
    } catch (err) {
      console.error('Unexpected error loading messages:', err)
      setMessages([])
    }
    setLoading(false)
  }

  // 3. Subscribe realtime
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any
          // Ambil nama sender
          let fullName = 'Unknown'
          try {
            const { data } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('id', newMsg.sender_id)
              .maybeSingle()
            if (data) fullName = data.full_name
          } catch {
            // Fallback
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMsg.sender_id)
              .maybeSingle()
            if (data) fullName = data.full_name
          }
          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              profiles: { full_name: fullName }
            }
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // 4. Kirim pesan
  const sendMessage = async (content: string) => {
    if (!roomId) return
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: currentUserId,
        content,
      })
    if (error) {
      console.error('Error send message:', error)
      throw error
    }
    await supabase
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', roomId)
  }

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-600 dark:bg-blue-800 text-white px-6 py-3">
        <h3 className="font-semibold">
          💬 Chat {currentUserRole === 'admin' ? 'dengan Customer' : 'dengan Admin'}
        </h3>
        <p className="text-sm text-blue-100">Order #{orderId.slice(0, 8)}</p>
      </div>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={loading}
      />
      <MessageInput onSend={sendMessage} disabled={!roomId} />
    </div>
  )
}