import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import BottomNav from '@/components/ui/BottomNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let userName = 'Admin'
  let role = 'admin'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      userName = profile.full_name || 'Admin'
      role = profile.role || 'admin'
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar role={role as 'admin' | 'customer'} userName={userName} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomNav role={role as 'admin' | 'customer'} />
    </div>
  )
}