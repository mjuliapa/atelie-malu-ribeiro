import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // cria o usuário se não existir
    const { data: users } = await admin.auth.admin.listUsers()
    const userExists = users?.users?.some((u) => u.email === email)

    if (!userExists) {
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })
      if (createError) {
        return NextResponse.json({ error: 'Não foi possível criar o acesso.' }, { status: 500 })
      }
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !data?.properties?.hashed_token) {
      return NextResponse.json({ error: 'Não foi possível gerar o acesso.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, token_hash: data.properties.hashed_token })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}