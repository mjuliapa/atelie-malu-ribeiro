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

  return (
    <div className="px-4 pb-4">
      {/* Card único grande */}
      <div className="bg-white rounded-2xl shadow-card px-6 pt-8 pb-6">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <LogoMark size={180} color="dark" />
        </div>

        <h1 className="font-display text-xl text-brand-text text-center mb-6">Meu perfil</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Nome completo
            </label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              WhatsApp
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(fmt(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-text focus:outline-none focus:border-brand-mauve transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              E-mail
            </label>
            <input type="email" value={email} disabled
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-brand-cream text-brand-muted cursor-not-allowed" />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50 transition-colors">
              {saved ? '✓ Salvo!' : loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
