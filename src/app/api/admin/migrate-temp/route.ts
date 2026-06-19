import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SECRET = 'malu-migrate-2026'

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const { secret, action } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  if (action === 'add_quantity') {
    // Testa se coluna já existe inserindo com quantity
    const { error } = await supabase
      .from('pieces')
      .select('id, quantity')
      .limit(1)
    return NextResponse.json({ 
      exists: !error,
      error: error?.message 
    })
  }

  if (action === 'check_quinta') {
    // Verifica slots das quintas
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id, start_time')
      .gte('start_time', '2026-06-18T00:00:00')
      .lte('start_time', '2026-06-18T23:59:59')
      .order('start_time')
    return NextResponse.json({ data, error: error?.message })
  }

  if (action === 'delete_quinta_1630') {
    // Busca os slots de 16:30 das quintas sem agendamento
    const { data: slots } = await supabase
      .from('schedule_slots')
      .select('id, start_time')
      .gte('start_time', '2026-06-01T00:00:00')

    // Filtra quintas 16:30 BRT = 19:30 UTC
    const toDelete = (slots ?? []).filter(s => {
      const d = new Date(s.start_time)
      const dayOfWeek = d.getUTCDay() // 4 = quinta em UTC pode ser diferente em BRT
      const hour = d.getUTCHours()
      const min = d.getUTCMinutes()
      // 16:30 BRT = 19:30 UTC
      return dayOfWeek === 4 && hour === 19 && min === 30
    })

    const ids = toDelete.map(s => s.id)
    if (!ids.length) return NextResponse.json({ deleted: 0, message: 'Nenhum slot encontrado' })

    // Verifica quais têm agendamento
    const { data: appts } = await supabase
      .from('appointments')
      .select('slot_id')
      .in('slot_id', ids)
      .eq('status', 'confirmed')

    const withAppt = new Set((appts ?? []).map(a => a.slot_id))
    const safeToDelete = ids.filter(id => !withAppt.has(id))

    if (!safeToDelete.length) return NextResponse.json({ deleted: 0, message: 'Todos têm agendamentos' })

    const { error } = await supabase
      .from('schedule_slots')
      .delete()
      .in('id', safeToDelete)

    return NextResponse.json({ deleted: safeToDelete.length, error: error?.message })
  }

  if (action === 'add_quinta_1800') {
    // Adiciona slots 18:00-20:30 BRT = 21:00-23:30 UTC nas quintas
    const slots = []
    for (let w = 0; w < 12; w++) {
      const base = new Date('2026-06-18T21:00:00Z')
      base.setUTCDate(base.getUTCDate() + w * 7)
      const end = new Date(base)
      end.setUTCHours(23, 30, 0, 0)
      slots.push({
        start_time: base.toISOString(),
        end_time: end.toISOString(),
        max_students: 8,
        torno_spots: 1,
        is_blocked: false,
      })
    }

    const { data, error } = await supabase
      .from('schedule_slots')
      .insert(slots)
      .select('id')

    return NextResponse.json({ inserted: data?.length ?? 0, error: error?.message })
  }

  if (action === 'add_quantity_column') {
    // Testa se já existe tentando inserir um registro de teste e deletando
    const { error: testError } = await supabase
      .from('pieces')
      .select('quantity')
      .limit(1)

    if (!testError) {
      return NextResponse.json({ message: 'Coluna quantity já existe' })
    }

    // Coluna não existe — Supabase JS não tem ALTER TABLE direto,
    // precisa do SQL via RPC. Como não temos exec_sql, retornamos
    // instrução manual.
    return NextResponse.json({
      error: 'Coluna quantity não existe. Precisa rodar SQL manualmente quando o dashboard voltar: ALTER TABLE pieces ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;'
    })
  }
  
  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}