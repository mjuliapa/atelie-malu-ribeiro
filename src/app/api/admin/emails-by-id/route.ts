import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const result: Record<string, string> = {}
  for (const id of ids) {
    const { data } = await supabase.auth.admin.getUserById(id)
    if (data?.user?.email) result[id] = data.user.email
  }
  return NextResponse.json(result)
}