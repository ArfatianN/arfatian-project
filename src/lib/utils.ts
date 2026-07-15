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

// ✅ Fungsi untuk format tanggal dengan timezone WIB (Asia/Jakarta)
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', // ✅ Tambahkan timezone WIB
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// ✅ Fungsi untuk format tanggal tanpa jam (hanya tanggal)
export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

// ✅ Fungsi untuk format waktu saja (jam:menit)
export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
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
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}