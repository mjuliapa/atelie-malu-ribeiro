'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/shared/LogoMark'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

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
        return
      }
      setLoading(false)
    }
    check()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Por favor, informe seu nome.'); return }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/auth/complete-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() }),
    })

    if (!res.ok) {
      setSaving(false)
      setError('Não foi possível salvar. Tente novamente.')
      return
    }

    window.location.href = '/aluno/agenda'
  }

  if (loading) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center justify-center py-20">
        <LogoMark size={200} color="dark" />
        <p className="text-sm text-brand-muted mt-6">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-10">
        <LogoMark size={200} color="dark" />
      </div>
      <div className="bg-white rounded-2xl shadow-card px-8 py-8">
        <h2 className="font-display text-xl text-brand-text mb-1">Bem-vinda ao ateliê!</h2>
        <p className="text-sm text-brand-muted mb-6">Antes de começar, nos conte seu nome.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome completo</label>
            <input
              type="text"
              required
              autoFocus
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">WhatsApp <span className="normal-case text-brand-muted/60">(opcional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve transition-colors"
            />
          </div>
          {error && <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={saving || !fullName.trim()}
            className="w-full py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Entrar no ateliê'}
          </button>
        </form>
      </div>
    </div>
  )
}