'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/shared/LogoMark'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(data.error ?? 'Não foi possível entrar.')
      return
    }

    // redireciona direto para o callback — sem código
    window.location.href = `/api/auth/callback?token_hash=${data.token_hash}&type=magiclink`
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-10">
        <LogoMark size={220} color="dark" />
      </div>

      <div className="bg-white rounded-2xl shadow-card px-8 py-8">
        <h2 className="font-display text-xl text-brand-text mb-1">Entrar na plataforma</h2>
        <p className="text-sm text-brand-muted mb-6">Digite seu e-mail para acessar.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">E-mail</label>
            <input type="email" required autoFocus value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors" />
          </div>
          {error && <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading || !email}
            className="w-full py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm tracking-wide hover:bg-brand-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-brand-muted mt-6">Problemas para acessar? Fale com a Malu.</p>
    </div>
  )
}