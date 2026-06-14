'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/shared/LogoMark'

export default function OnboardingPage() {
  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!profile) { window.location.href = '/login'; return }

      if (profile.onboarding_completed) {
        window.location.href = profile.role === 'admin' ? '/admin' : '/aluno/agenda'
      } else {
        window.location.href = '/login'
      }
    }
    check()
  }, [])

  return (
    <div className="w-full max-w-sm flex flex-col items-center justify-center py-20">
      <LogoMark size={200} color="dark" />
      <p className="text-sm text-brand-muted mt-6">Carregando...</p>
    </div>
  )
}