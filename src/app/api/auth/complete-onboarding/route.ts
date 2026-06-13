import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { fullName, phone } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
      .from('profiles')
      .update({ full_name: fullName, phone, onboarding_completed: true })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ success: true, role: profile?.role })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}