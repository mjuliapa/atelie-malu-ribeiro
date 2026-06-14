import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const tempResponse = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            tempResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'magiclink',
  })

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // usa service role para ler o profile sem depender de RLS
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const dest = profile?.role === 'admin' ? '/admin' : '/aluno/agenda'

  const finalResponse = NextResponse.redirect(new URL(dest, request.url))
  tempResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    finalResponse.cookies.set(name, value, options)
  })

  return finalResponse
}