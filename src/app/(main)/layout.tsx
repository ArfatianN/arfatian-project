import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let userName = 'User'
  let role = 'customer'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      userName = profile.full_name || 'User'
      role = profile.role || 'customer'
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar role={role as 'admin' | 'customer'} userName={userName} />
      <main className="flex-1">{children}</main>
    </div>
  )
}