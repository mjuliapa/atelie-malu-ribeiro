import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

type CustoValue = {
  grupo: 'produtos' | 'operacional' | 'investimento'
  categoria: string
  tipo: 'fixo' | 'variavel'
  valor: number
  data: string
  descricao?: string | null
  recorrente?: boolean
  dia_do_mes?: number | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const grupo = searchParams.get('grupo')
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value, updated_at')
    .like('key', 'expense_%')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  let custos = (data ?? []).map(row => ({
    id: row.key.replace('expense_', ''),
    ...(row.value as CustoValue),
  }))

  if (grupo) custos = custos.filter(c => c.grupo === grupo)
  if (from) custos = custos.filter(c => c.data >= from)
  if (to) custos = custos.filter(c => c.data <= to)

  return NextResponse.json(custos)
}

export async function POST(request: NextRequest) {
  const body: CustoValue = await request.json()
  const supabase = getSupabase()

  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('system_settings')
    .insert({
      key: `expense_${id}`,
      value: body,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = getSupabase()
  const { error } = await supabase
    .from('system_settings')
    .delete()
    .eq('key', `expense_${id}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}