'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/shared/LogoMark'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [tokenHash, setTokenHash] = useState('')

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Não foi possível enviar o código.')
      return
    }

    setTokenHash(data.token_hash ?? '')
    setStep('otp')
    startResendCooldown()
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const params = new URLSearchParams({
      token_hash: tokenHash,
      type: 'magiclink',
      otp,
    })
    window.location.href = `/api/auth/callback?${params.toString()}`
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setError(null)
    setLoading(true)

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)
    setOtp('')

    if (res.ok) {
      setTokenHash(data.token_hash ?? '')
      startResendCooldown()
    } else {
      setError(data.error ?? 'Não foi possível reenviar.')
    }
  }

  function startResendCooldown() {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-10">
        <LogoMark size={220} color="dark" />
      </div>

      <div className="bg-white rounded-2xl shadow-card px-8 py-8">
        {step === 'email' ? (
          <>
            <h2 className="font-display text-xl text-brand-text mb-1">Entrar na plataforma</h2>
            <p className="text-sm text-brand-muted mb-6">Digite seu e-mail para receber um código de acesso.</p>
            <form onSubmit={handleSendOTP} className="space-y-4">
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
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          </>
        ) : (
          <>
            <button onClick={() => { setStep('email'); setOtp(''); setError(null) }}
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors mb-5">
              ← Voltar
            </button>
            <h2 className="font-display text-xl text-brand-text mb-1">Código enviado</h2>
            <p className="text-sm text-brand-muted mb-1">Enviamos um código de 6 dígitos para</p>
            <p className="text-sm font-medium text-brand-text mb-6">{email}</p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Código</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-lg border border-brand-line bg-brand-cream text-brand-text text-center text-2xl tracking-[0.4em] placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-mauve focus:ring-1 focus:ring-brand-mauve transition-colors" />
              </div>
              {error && <p className="text-sm text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full py-3 px-4 bg-brand-ink text-brand-cream rounded-lg font-medium text-sm tracking-wide hover:bg-brand-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <p className="text-xs text-brand-muted">Reenviar em {resendCooldown}s</p>
              ) : (
                <button onClick={handleResend} disabled={loading}
                  className="text-xs text-brand-mauve hover:underline disabled:opacity-50">
                  Não recebi o código — reenviar
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <p className="text-center text-xs text-brand-muted mt-6">Problemas para acessar? Fale com a Malu.</p>
    </div>
  )
}