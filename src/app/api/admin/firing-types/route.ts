import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { name } = await request.json()
  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('firing_types')
    .select('id, name')
    .eq('name', name)
    .maybeSingle()

  if (existing) return NextResponse.json(existing)

  const { data, error } = await supabase
    .from('firing_types')
    .insert({ name, coefficient: 1, description: `Canal de venda: ${name}`, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}