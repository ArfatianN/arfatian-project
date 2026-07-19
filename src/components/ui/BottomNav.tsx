'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  role: 'admin' | 'customer'
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()

  // Menu untuk customer
  const customerMenu = [
    { label: 'Beranda', href: '/dashboard', icon: '🏠' },
    { label: 'Layanan', href: '/services', icon: '🔧' },
    { label: 'Pesanan', href: '/orders', icon: '📦' },
    { label: 'Profil', href: '/profile', icon: '👤' },
  ]

  // Menu untuk admin
  const adminMenu = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Jasa', href: '/admin/services', icon: '⚙️' },
    { label: 'Pesanan', href: '/admin/orders', icon: '📦' },
    { label: 'Profil', href: '/profile', icon: '👤' },
  ]

  const menuItems = role === 'admin' ? adminMenu : customerMenu

  // Sembunyikan bottom nav di halaman login/register
  const hidePaths = ['/sign-in', '/sign-up', '/admin-register', '/forgot-password', '/reset-password']
  if (hidePaths.includes(pathname)) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-xs mt-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}