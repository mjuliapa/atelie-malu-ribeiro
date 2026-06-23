import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const PREFIX = 'custo:'

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
  descricao?: string | null
  recorrente?: boolean
  dia_do_mes?: number | null
}

async function getAdminId(supabase: ReturnType<typeof getSupabase>) {
  const { data } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()
  return data?.id as string | undefined
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const grupo = searchParams.get('grupo')
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('package_charges')
    .select('id, value, created_at, package_type')
    .like('package_type', `${PREFIX}%`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  let custos = (data ?? []).map(row => {
    const json = row.package_type.slice(PREFIX.length)
    const parsed: CustoValue = JSON.parse(json)
    return {
      id: row.id,
      valor: row.value,
      data: row.created_at.split('T')[0],
      ...parsed,
    }
  })

  if (grupo) custos = custos.filter(c => c.grupo === grupo)
  if (from) custos = custos.filter(c => c.data >= from)
  if (to) custos = custos.filter(c => c.data <= to)

  return NextResponse.json(custos)
}

export async function POST(request: NextRequest) {
  const body: CustoValue & { valor: number; data: string } = await request.json()
  const supabase = getSupabase()

  const adminId = await getAdminId(supabase)
  if (!adminId) return NextResponse.json({ error: 'Nenhum admin encontrado em profiles' }, { status: 400 })

  const { grupo, categoria, tipo, descricao, recorrente, dia_do_mes } = body
  const packageType = PREFIX + JSON.stringify({ grupo, categoria, tipo, descricao, recorrente, dia_do_mes })

  const { data, error } = await supabase
    .from('package_charges')
    .insert({
      student_id: adminId,
      package_type: packageType,
      credits: 0,
      value: body.valor,
      status: 'cancelled',
      created_at: body.data,
      created_by: adminId,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = getSupabase()
  const { error } = await supabase
    .from('package_charges')
    .delete()
    .eq('id', id)
    .like('package_type', `${PREFIX}%`) // proteção: nunca apaga pacote real

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}