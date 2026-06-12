import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rotas públicas
  if (pathname.startsWith('/login') || pathname === '/') {
    if (user) {
      // Usuário logado tentando acessar login — redirecionar
      const profile = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profile.data) {
        if (!profile.data.onboarding_completed) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        const dest = profile.data.role === 'admin' ? '/admin' : '/aluno/agenda'
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }
    return supabaseResponse
  }

  // Rota de onboarding
  if (pathname === '/onboarding') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Rotas protegidas — exigem login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar perfil e onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!profile.onboarding_completed && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Proteger rotas /admin para não-admins
  if (pathname.startsWith('/admin') && profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/aluno/agenda', request.url))
  }

  // Proteger rotas /aluno para admins (opcional — admin pode ver tudo)
  // if (pathname.startsWith('/aluno') && profile.role === 'admin') {
  //   return NextResponse.redirect(new URL('/admin', request.url))
  // }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
