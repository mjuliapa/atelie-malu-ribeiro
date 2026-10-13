import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — lista estoque com nome do tipo de argila
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('clay_inventory')
    .select('*, clay_types(name, price)')
    .order('clay_types(name)')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data ?? [])
}

// POST — cria ou atualiza entrada de estoque para um clay_type_id
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { clay_type_id, initial_quantity, notes } = body
  const supabase = getSupabase()

  // verifica se já existe
  const { data: existing } = await supabase
    .from('clay_inventory')
    .select('id')
    .eq('clay_type_id', clay_type_id)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('clay_inventory')
      .update({ initial_quantity, current_quantity: initial_quantity, notes })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('clay_inventory')
    .insert({ clay_type_id, initial_quantity, current_quantity: initial_quantity, notes })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PATCH — ajusta current_quantity (saída manual ou correção)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, current_quantity, notes } = body
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('clay_inventory')
    .update({ current_quantity, ...(notes !== undefined ? { notes } : {}) })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}