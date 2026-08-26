import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SECRET = 'malu-migrate-2026'

// Converte um timestamptz (ISO, UTC) pra data (yyyy-MM-dd) no horário de Brasília (UTC-3, sem horário de verão)
function toBRTDateStr(iso: string) {
  const d = new Date(iso)
  const shifted = new Date(d.getTime() - 3 * 3600 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysBRT(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function dowFromDateStrBRT(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, action } = body
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
  
  if (action === 'check_ultima_aula') {
    const { data: ultima, error } = await supabase
      .from('schedule_slots')
      .select('id, start_time, end_time')
      .order('start_time', { ascending: false })
      .limit(1)

    const { count } = await supabase
      .from('schedule_slots')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      ultima_aula: ultima?.[0] ?? null,
      ultima_aula_brt: ultima?.[0] ? toBRTDateStr(ultima[0].start_time) : null,
      total_slots: count,
      error: error?.message,
    })
  }

  if (action === 'criar_slots_semanais') {
    // Padrão confirmado: seg-sex 9h/14h/18h, sáb 9h/14h, dom 9h (horário de Brasília, UTC-3)
    const HORARIOS_POR_DIA: Record<number, string[]> = {
      0: ['09:00'],                   // domingo
      1: ['09:00', '14:00', '18:00'], // segunda
      2: ['09:00', '14:00', '18:00'], // terça
      3: ['09:00', '14:00', '18:00'], // quarta
      4: ['09:00', '14:00', '18:00'], // quinta
      5: ['09:00', '14:00', '18:00'], // sexta
      6: ['09:00', '14:00'],          // sábado
    }
    const MAX_STUDENTS = 8
    const TORNO_SPOTS = 1
    const FIXED_DURATION_MIN = 150 // 2h30, igual ao padrão de criação manual

    const ate = (typeof body?.ate === 'string' && body.ate) || '2026-12-31'
    const dryRun = body?.dry_run === true

    const { data: ultima } = await supabase
      .from('schedule_slots')
      .select('start_time')
      .order('start_time', { ascending: false })
      .limit(1)

    const desdeParam = typeof body?.desde === 'string' && body.desde ? body.desde : null
    let cursor = desdeParam
      ?? (ultima?.[0]?.start_time ? addDaysBRT(toBRTDateStr(ultima[0].start_time), 1) : toBRTDateStr(new Date().toISOString()))

    if (cursor > ate) {
      return NextResponse.json({
        message: 'Nada a criar: data de início já é posterior à data final.',
        desde: cursor,
        ate,
        ultima_aula_atual: ultima?.[0]?.start_time ?? null,
      })
    }

    // Busca slots já existentes no intervalo, pra não duplicar em caso de reexecução
    const { data: existentes } = await supabase
      .from('schedule_slots')
      .select('start_time')
      .gte('start_time', `${cursor}T00:00:00-03:00`)
      .lte('start_time', `${ate}T23:59:59-03:00`)

    const existentesSet = new Set((existentes ?? []).map(s => new Date(s.start_time).toISOString()))

    const novosSlots: { start_time: string; end_time: string; max_students: number; torno_spots: number; is_blocked: boolean }[] = []
    const primeiroDia = cursor
    while (cursor <= ate) {
      const dow = dowFromDateStrBRT(cursor)
      const horarios = HORARIOS_POR_DIA[dow] ?? []
      for (const hh of horarios) {
        const startISO = `${cursor}T${hh}:00-03:00`
        const startDate = new Date(startISO)
        const isoCheck = startDate.toISOString()
        if (existentesSet.has(isoCheck)) continue

        const endDate = new Date(startDate.getTime() + FIXED_DURATION_MIN * 60000)
        novosSlots.push({
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          max_students: MAX_STUDENTS,
          torno_spots: TORNO_SPOTS,
          is_blocked: false,
        })
      }
      cursor = addDaysBRT(cursor, 1)
    }

    if (dryRun) {
      return NextResponse.json({
        dry_run: true,
        desde: primeiroDia,
        ate,
        a_criar: novosSlots.length,
        amostra: novosSlots.slice(0, 6),
      })
    }

    if (!novosSlots.length) {
      return NextResponse.json({ criados: 0, desde: primeiroDia, ate, message: 'Nenhum slot novo (já existiam todos).' })
    }

    const { data: inseridos, error } = await supabase
      .from('schedule_slots')
      .insert(novosSlots)
      .select('id')

    return NextResponse.json({
      criados: inseridos?.length ?? 0,
      desde: primeiroDia,
      ate,
      error: error?.message,
    })
  }

  return NextResponse.json({ error: 'action inválida' }, { status: 400 })
}