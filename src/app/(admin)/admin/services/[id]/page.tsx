import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ServiceForm from '@/components/admin/ServiceForm'

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Cek login admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // 2. Ambil data service
  const { data: service, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !service) {
    console.error('Service not found:', id, error)
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ServiceForm service={service} isEditing />
    </div>
  )
}