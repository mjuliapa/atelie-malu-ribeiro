'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

const PRECOS = { manual: 420, torno: 460 }

function PacoteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaId = searchParams.get('aluna') ?? ''
  const tipoParam = (searchParams.get('tipo') ?? 'manual') as 'manual' | 'torno'

  const [alunaName, setAlunaName] = useState('')
  const [tipo, setTipo] = useState<'manual' | 'torno'>(tipoParam)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!alunaId) return
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => {
        const aluna = students.find((s: any) => s.id === alunaId)
        if (aluna) setAlunaName(aluna.full_name)
      })
  }, [alunaId])

  async function handleSave() {
    if (!alunaId) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // cria cobrança
    await fetch('/api/admin/package-charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: alunaId,
        package_type: tipo,
        credits: 4,
        value: PRECOS[tipo],
        status: 'awaiting_payment',
        created_by: user.id,
      }),
    })

    // adiciona 4 créditos na aluna
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', alunaId).single()
    const currentCredits = profile?.credits ?? 0
    await supabase.from('profiles').update({
      credits: currentCredits + 4,
      package_type: tipo,
    }).eq('id', alunaId)

    setSaving(false)
    router.push(`/admin/alunos/${alunaId}`)
  }

  return (
    <>
      <AdminNavHeader title="Cobrança de pacote" showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-2xl text-brand-text">Cobrança de pacote</h1>

        {alunaName && (
          <div className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Aluna</p>
            <p className="font-medium text-brand-text">{alunaName}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Tipo de pacote</label>
          <div className="grid grid-cols-2 gap-2">
            {(['manual', 'torno'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                  tipo === t ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text'
                }`}>
                {t === 'manual' ? '✋ Manual' : '🏺 Torno'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-brand-blush rounded-xl p-4 space-y-1">
          <p className="text-xs text-brand-mauve">Resumo da cobrança</p>
          <div className="flex justify-between items-center">
            <p className="text-sm text-brand-mauve">4 aulas — pacote {tipo}</p>
            <p className="font-display text-2xl text-brand-mauve">{formatCurrency(PRECOS[tipo])}</p>
          </div>
          <p className="text-xs text-brand-mauve/70">+4 créditos adicionados à conta da aluna</p>
        </div>

        <button onClick={handleSave} disabled={saving || !alunaId}
          className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
          {saving ? 'Gerando...' : 'Confirmar cobrança'}
        </button>
      </div>
    </>
  )
}

export default function PacotePage() {
  return <Suspense><PacoteContent /></Suspense>
}