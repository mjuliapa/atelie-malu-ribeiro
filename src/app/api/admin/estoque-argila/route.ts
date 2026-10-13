import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('clay_inventory')
    .select('*, clay_types(id, name, price)')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // ordena por nome do tipo
  const sorted = (data ?? []).sort((a: any, b: any) =>
    (a.clay_types?.name ?? '').localeCompare(b.clay_types?.name ?? '', 'pt-BR')
  )
  return NextResponse.json(sorted)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { clay_type_id, initial_quantity, notes } = body
  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('clay_inventory')
    .select('id')
    .eq('clay_type_id', clay_type_id)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('clay_inventory')
      .update({ initial_quantity, current_quantity: initial_quantity, notes: notes ?? null })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('clay_inventory')
    .insert({ clay_type_id, initial_quantity, current_quantity: initial_quantity, notes: notes ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PATCH: ajusta current_quantity (saída manual ou correção de inventário)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, current_quantity, delta, notes } = body
  const supabase = getSupabase()

  if (delta !== undefined) {
    // desconta delta do estoque atual
    const { data: item } = await supabase
      .from('clay_inventory')
      .select('current_quantity')
      .eq('id', id)
      .single()
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    const nova = Math.max(0, item.current_quantity - delta)
    const { data, error } = await supabase
      .from('clay_inventory')
      .update({ current_quantity: nova })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('clay_inventory')
    .update({ current_quantity, ...(notes !== undefined ? { notes } : {}) })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}