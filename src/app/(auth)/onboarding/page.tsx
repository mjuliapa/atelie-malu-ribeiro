'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/shared/LogoMark'

export default function OnboardingPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, onboarding_completed, role')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        window.location.href = profile.role === 'admin' ? '/admin' : '/aluno/agenda'
        return
      }

      if (profile?.full_name) setFullName(profile.full_name)
      if (profile?.phone) setPhone(fmt(profile.phone))
      setChecking(false)
    }
    checkProfile()
  }, [])

  function fmt(value: string) {
    const d = value.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return `(${d}`
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/auth/complete-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, ''),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Não foi possível salvar. Tente novamente.')
      return
    }

    window.location.href = data.role === 'admin' ? '/admin' : '/aluno/agenda'
  }

  if (checking) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center justify-center py-20">
        <LogoMark size={48} color="mauve" />
        <p className="text-sm text-brand-muted mt-4">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-10">
        <LogoMark size={64} />
        <h1 className="font-script text-3xl text-brand-ink mt-4">Malu Ribeiro</h1>
        <p className="font-display text-xs tracking-[0.2em] uppercase text-brand-muted mt-1">Cerâmica Autoral</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card px-8 py-8">
        <h2 className="font-display text-xl text-brand-text mb-1">Bem-vinda ao ateliê 🌸</h2>
        <p className="text-sm text-brand-muted mb-6">Antes de começar, confirme seus dados para a Malu ter seu contato.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome completo</label>
            <input type="text" required autoFocus value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">WhatsApp</label>
            <input type="tel" required value={phone}
              onChange={(e) => setPhone(fmt(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors" />
          </div>

          {error && <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>}

          <button type="submit"
            disabled={loading || !fullName.trim() || phone.replace(/\D/g, '').length < 10}
            className="w-full py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm tracking-wide hover:bg-brand-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Salvando...' : 'Entrar no ateliê'}
          </button>
        </form>
      </div>
    </div>
  )
}
