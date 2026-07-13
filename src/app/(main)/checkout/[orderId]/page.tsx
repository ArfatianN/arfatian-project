'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'  // ✅ Import Script
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface Order {
  id: string
  order_code: string
  total_amount: number
  status: string
  services: {
    name: string
    price: number
    duration: number
  }
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'midtrans' | 'bank_transfer' | 'cash'>('midtrans')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [snapLoaded, setSnapLoaded] = useState(false) // ✅ state untuk snap.js
  const [pendingToken, setPendingToken] = useState<string | null>(null) // ✅ token yang menunggu

  const snapPayRef = useRef<((token: string) => void) | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services (
            name,
            price,
            duration
          )
        `)
        .eq('id', orderId)
        .single()

      if (error || !data) {
        setError('Pesanan tidak ditemukan')
        setLoading(false)
        return
      }

      if (data.status !== 'pending') {
        router.push(`/orders/${data.id}`)
        return
      }

      setOrder(data)
      setLoading(false)
    }

    fetchOrder()
  }, [orderId, supabase, router])

  // Fungsi untuk memanggil snap.pay setelah token didapat
  const executeSnapPay = (token: string) => {
    // @ts-ignore
    if (window.snap) {
      // @ts-ignore
      window.snap.pay(token, {
        onSuccess: (result: any) => {
          console.log('Payment success:', result)
          router.push(`/orders/${order!.id}`)
        },
        onPending: (result: any) => {
          console.log('Payment pending:', result)
          router.push(`/orders/${order!.id}`)
        },
        onError: (result: any) => {
          console.error('Payment error:', result)
          setError('Pembayaran gagal, silakan coba lagi')
          setSubmitting(false)
        },
        onClose: () => {
          setSubmitting(false)
        }
      })
    } else {
      // Jika snap belum load, simpan token dan tunggu
      setPendingToken(token)
    }
  }

  // Saat snapLoaded berubah menjadi true, jika ada pendingToken, jalankan pembayaran
  useEffect(() => {
    if (snapLoaded && pendingToken) {
      executeSnapPay(pendingToken)
      setPendingToken(null)
    }
  }, [snapLoaded, pendingToken])

  // Proses pembayaran
  const handlePay = async () => {
    if (!order) return

    setSubmitting(true)
    setError('')

    try {
      if (paymentMethod === 'midtrans') {
        // Panggil API untuk mendapatkan token
        const response = await fetch('/api/midtrans/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Gagal memproses pembayaran')
        }

        // Jika snap sudah dimuat, langsung bayar, jika belum simpan token
        if (snapLoaded) {
          executeSnapPay(data.token)
        } else {
          setPendingToken(data.token)
          // Jika snap belum load, tunggu hingga snapLoaded menjadi true
          // (effect di atas akan mengeksekusi)
        }
      } else {
        // Bank transfer atau cash
        let proofUrl = null
        if (paymentMethod === 'bank_transfer' && uploadFile) {
          const formData = new FormData()
          formData.append('file', uploadFile)
          formData.append('orderId', order.id)

          const uploadResponse = await fetch('/api/upload/proof', {
            method: 'POST',
            body: formData,
          })

          const uploadData = await uploadResponse.json()
          if (!uploadResponse.ok) {
            throw new Error(uploadData.message || 'Gagal upload bukti')
          }
          proofUrl = uploadData.url
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_method: paymentMethod,
            payment_proof_url: proofUrl,
          })
          .eq('id', order.id)

        if (updateError) {
          throw new Error('Gagal menyimpan data pembayaran')
        }

        router.push(`/orders/${order.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      {/* ✅ Load Snap.js dengan next/script */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Snap.js loaded')
          setSnapLoaded(true)
        }}
        onError={() => {
          console.error('Snap.js failed to load')
          setError('Gagal memuat Snap.js, silakan refresh halaman')
        }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Checkout</h1>

        {/* Ringkasan Pesanan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ringkasan Pesanan</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Kode Pesanan</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">{order?.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Layanan</span>
                <span className="font-medium text-gray-900 dark:text-white">{order?.services?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Durasi</span>
                <span className="text-gray-900 dark:text-white">{order?.services?.duration} hari</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatRupiah(order?.total_amount || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metode Pembayaran</h2>

            <div className="space-y-3">
              <label className="flex items-center p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="midtrans"
                  checked={paymentMethod === 'midtrans'}
                  onChange={() => setPaymentMethod('midtrans')}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Bayar Online (Midtrans)</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">QRIS, Kartu Kredit, GoPay, dll</p>
                </div>
              </label>

              <label className="flex items-center p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={() => setPaymentMethod('bank_transfer')}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Transfer Bank Manual</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">BCA, Mandiri, BRI, dll</p>
                </div>
              </label>

              <label className="flex items-center p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Bayar Cash (Langsung)</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bayar di tempat kami</p>
                </div>
              </label>
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-2">⚠️ Instruksi Transfer</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">Silakan transfer ke rekening berikut:</p>
                <div className="bg-white dark:bg-gray-700 p-3 rounded border border-yellow-200 dark:border-yellow-800 mb-3">
                  <p className="text-sm font-mono text-gray-900 dark:text-white">Bank BCA: 1234567890 a/n CV Jasa Kreatif</p>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">Upload bukti transfer setelah selesai:</p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {uploadFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ {uploadFile.name} siap diupload</p>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={submitting || (paymentMethod === 'bank_transfer' && !uploadFile)}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Memproses...
            </span>
          ) : paymentMethod === 'midtrans' ? (
            'Bayar dengan Midtrans'
          ) : paymentMethod === 'bank_transfer' ? (
            uploadFile ? 'Konfirmasi Pembayaran' : 'Upload Bukti Transfer'
          ) : (
            'Konfirmasi Pesanan'
          )}
        </button>
      </div>
    </div>
  )
}