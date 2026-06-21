'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

const PRECO_AULA = { manual: 105, torno: 115 } // valor unitário por aula

function PacoteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaId = searchParams.get('aluna') ?? ''
  const tipoParam = (searchParams.get('tipo') ?? 'manual') as 'manual' | 'torno'

  const [alunaName, setAlunaName] = useState('')
  const [students, setStudents] = useState<{id: string, full_name: string}[]>([])
  const [selectedAlunaId, setSelectedAlunaId] = useState(alunaId)
  const [tipo, setTipo] = useState<'manual' | 'torno'>(tipoParam)
  const [credits, setCredits] = useState(4)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => {
        setStudents(students)
        if (alunaId) {
          const aluna = students.find((s: any) => s.id === alunaId)
          if (aluna) setAlunaName(aluna.full_name)
        }
      })
  }, [alunaId])

  const valorTotal = credits * PRECO_AULA[tipo]

  async function handleSave() {
    if (!selectedAlunaId) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await fetch('/api/admin/package-charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selectedAlunaId,
        package_type: tipo,
        credits,
        value: valorTotal,
        status: 'awaiting_payment',
        created_by: user.id,
      }),
    })

    setSaving(false)
    router.push(`/admin/alunos/${selectedAlunaId}`)
  }

  return (
    <>
      <AdminNavHeader title="Cobrança de pacote" showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-2xl text-brand-text">Cobrança de pacote</h1>

        {!alunaId ? (
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Aluna</label>
            <select value={selectedAlunaId} onChange={e => setSelectedAlunaId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve">
              <option value="">Selecione a aluna</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        ) : alunaName ? (
          <div className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs text-brand-muted mb-1">Aluna</p>
            <p className="font-medium text-brand-text">{alunaName}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Tipo de pacote</label>
          <div className="grid grid-cols-2 gap-2">
            {(['manual', 'torno'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`py-3 rounded-xl border text-sm font-medium transition-colors ${tipo === t ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text'}`}>
                {t === 'manual' ? 'Manual' : 'Torno'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Quantidade de aulas</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setCredits(c => Math.max(2, c - 1))}
              className="w-10 h-10 rounded-xl border border-brand-line bg-white text-brand-text text-lg font-medium hover:border-brand-mauve transition-colors">
              −
            </button>
            <span className="font-display text-2xl text-brand-text min-w-[2rem] text-center">{credits}</span>
            <button type="button" onClick={() => setCredits(c => c + 1)}
              className="w-10 h-10 rounded-xl border border-brand-line bg-white text-brand-text text-lg font-medium hover:border-brand-mauve transition-colors">
              +
            </button>
            <span className="text-xs text-brand-muted">mínimo 2 aulas</span>
          </div>
          <div className="flex gap-2 mt-2">
            {[2, 4, 8, 12].map(n => (
              <button key={n} type="button" onClick={() => setCredits(n)}
                className="px-3 py-1.5 rounded-lg border border-brand-line bg-white text-xs text-brand-muted hover:border-brand-mauve transition-colors">
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-brand-blush rounded-xl p-4 space-y-1">
          <p className="text-xs text-brand-mauve">Resumo da cobrança</p>
          <div className="flex justify-between items-center">
            <p className="text-sm text-brand-mauve">{credits} aula{credits !== 1 ? 's' : ''} — pacote {tipo}</p>
            <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valorTotal)}</p>
          </div>
          <p className="text-xs text-brand-mauve/70">
            {formatCurrency(PRECO_AULA[tipo])} por aula · créditos liberados após confirmação do pagamento
          </p>
        </div>

        <button onClick={handleSave} disabled={saving || !selectedAlunaId || credits < 2}
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