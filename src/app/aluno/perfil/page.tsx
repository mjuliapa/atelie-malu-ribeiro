'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/shared/LogoMark'

export default function AlunoPerfilPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setPhone(fmt(profile.phone ?? ''))
      }
    }
    load()
  }, [])

  function fmt(value: string) {
    const d = value.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return `(${d}`
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
    }).eq('id', user.id)

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="pt-16 px-4 pb-24 space-y-5">
      <div className="pt-2">
        <h1 className="font-display text-2xl text-brand-text">Meu perfil</h1>
      </div>

      {/* Logo */}
      <div className="flex justify-center py-4">
        <LogoMark size={160} color="dark" />
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Nome completo
            </label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              WhatsApp
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(fmt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              E-mail
            </label>
            <input type="email" value={email} disabled
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-muted cursor-not-allowed" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {saved ? '✓ Salvo!' : loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full py-3 bg-white text-brand-muted border border-brand-line rounded-xl font-medium text-sm hover:border-brand-mauve hover:text-brand-mauve transition-colors">
        Sair da conta
      </button>
    </div>
  )
}
