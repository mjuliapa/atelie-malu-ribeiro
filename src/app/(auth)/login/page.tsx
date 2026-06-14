'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/shared/LogoMark'

const ADMIN_EMAIL = 'ateliemaluribeiro@gmail.com'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = email.toLowerCase() === ADMIN_EMAIL

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isAdmin) {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setLoading(false)
        setError(data.error ?? 'Senha incorreta.')
        return
      }

      window.location.href = '/admin'
      return
    }

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
              onChange={(e) => { setEmail(e.target.value); setPassword('') }}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors" />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors pr-12" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text">
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading || !email || (isAdmin && !password)}
            className="w-full py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm tracking-wide hover:bg-brand-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
      <a href="https://wa.me/5561999826866" target="_blank" rel="noopener noreferrer"
        className="block text-center text-xs text-brand-muted mt-6 hover:text-brand-mauve transition-colors">
        Problemas para acessar? Fale com a Malu 💬
      </a>
    </div>
  )
}