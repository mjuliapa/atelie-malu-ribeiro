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

  if (action === 'check_quinta') {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id, start_time')
      .gte('start_time', '2026-06-18T00:00:00')
      .lte('start_time', '2026-06-18T23:59:59')
      .order('start_time')
    return NextResponse.json({ data, error: error?.message })
  }

  if (action === 'delete_quinta_1630') {
    const { data: slots } = await supabase
      .from('schedule_slots')
      .select('id, start_time')
      .gte('start_time', '2026-06-01T00:00:00')

    const toDelete = (slots ?? []).filter(s => {
      const d = new Date(s.start_time)
      return d.getUTCDay() === 4 && d.getUTCHours() === 19 && d.getUTCMinutes() === 30
    })

    const ids = toDelete.map(s => s.id)
    if (!ids.length) return NextResponse.json({ deleted: 0, message: 'Nenhum slot encontrado' })

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

  if (action === 'fix_quinta_1800') {
    const { data: slots } = await supabase
      .from('schedule_slots')
      .select('id, start_time')
      .gte('start_time', '2026-06-01T00:00:00')
      .order('start_time')

    const slots1800 = (slots ?? []).filter(s => {
      const d = new Date(s.start_time)
      return d.getUTCDay() === 4 && d.getUTCHours() === 21 && d.getUTCMinutes() === 0
    })

    const byDate: Record<string, typeof slots1800> = {}
    for (const s of slots1800) {
      const date = s.start_time.split('T')[0]
      if (!byDate[date]) byDate[date] = []
      byDate[date].push(s)
    }

    const toDelete: string[] = []
    for (const date in byDate) {
      const group = byDate[date]
      if (group.length > 1) {
        toDelete.push(...group.slice(1).map(s => s.id))
      }
    }

    if (!toDelete.length) return NextResponse.json({ message: 'Sem duplicatas', total: slots1800.length, byDate })

    const { error } = await supabase
      .from('schedule_slots')
      .delete()
      .in('id', toDelete)

    return NextResponse.json({ deleted: toDelete.length, remaining: slots1800.length - toDelete.length, error: error?.message })
  }

  if (action === 'add_quinta_1800') {
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

  if (action === 'check_quantity_column') {
    const { error } = await supabase
      .from('pieces')
      .select('quantity')
      .limit(1)
    return NextResponse.json({
      exists: !error,
      error: error?.message,
    })
  }

  if (action === 'create_quantity_column_pgmeta') {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    try {
      const res = await fetch(`${projectUrl}/pg-meta/default/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          table: 'pieces',
          name: 'quantity',
          type: 'integer',
          default_value: '1',
          is_nullable: false,
        }),
      })

      const result = await res.json().catch(() => null)
      return NextResponse.json({ status: res.status, result })
    } catch (err: any) {
      return NextResponse.json({ error: err.message })
    }
  }
  if (action === 'create_venda_livre_firing_type') {
    const { data: existing } = await supabase
      .from('firing_types')
      .select('id')
      .eq('name', 'Venda livre (sem cálculo)')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Já existe', id: existing.id })
    }

    const { data, error } = await supabase
      .from('firing_types')
      .insert({
        name: 'Venda livre (sem cálculo)',
        coefficient: 1,
        description: 'Usado para venda de peças avulsas — valor digitado diretamente',
        is_active: true,
      })
      .select()
      .single()

    return NextResponse.json({ data, error: error?.message })
  }
  
  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}