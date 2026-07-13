import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Fungsi untuk menggabungkan className dengan tailwind-merge (biar tidak bentrok)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fungsi untuk format Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Fungsi untuk generate kode pesanan unik (contoh: ORD-20260113-ABC123)
export function generateOrderCode(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${year}${month}${day}-${random}`
}

// Fungsi untuk format tanggal
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// Fungsi untuk mendapatkan status pesanan dalam Bahasa Indonesia
export function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Menunggu Pembayaran',
    paid: 'Sudah Dibayar',
    processing: 'Sedang Diproses',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  }
  return statusMap[status] || status
}

// Fungsi untuk mendapatkan warna badge status
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}