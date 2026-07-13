import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function DebugPage() {
  const supabase = await createClient()
  
  // Coba dengan supabase biasa (RLS)
  const { data: dataNormal, error: errorNormal } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
  
  // Coba dengan supabaseAdmin (bypass RLS)
  const { data: dataAdmin, error: errorAdmin } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('is_active', true)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Services</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Dengan supabase biasa (RLS):</h2>
        {errorNormal ? (
          <pre className="bg-red-100 p-4 text-red-700">{JSON.stringify(errorNormal, null, 2)}</pre>
        ) : (
          <pre className="bg-gray-100 p-4">{JSON.stringify(dataNormal, null, 2)}</pre>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Dengan supabaseAdmin (bypass RLS):</h2>
        {errorAdmin ? (
          <pre className="bg-red-100 p-4 text-red-700">{JSON.stringify(errorAdmin, null, 2)}</pre>
        ) : (
          <pre className="bg-gray-100 p-4">{JSON.stringify(dataAdmin, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}