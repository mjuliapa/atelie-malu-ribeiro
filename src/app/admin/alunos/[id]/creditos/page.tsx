'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { useParams, useRouter } from 'next/navigation'

export default function CreditosPage() {
  const { id } = useParams()
  const router = useRouter()
  const [credits, setCredits] = useState(0)
  const [packageType, setPackageType] = useState<'manual' | 'torno'>('manual')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => {
        const aluna = students.find((s: any) => s.id === id)
        if (aluna) {
          setCredits(aluna.credits ?? 0)
          setPackageType(aluna.package_type ?? 'manual')
        }
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/admin/credits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, credits, package_type: packageType }),
    })
    setSaving(false)
    router.back()
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>

  return (
    <>
      <AdminNavHeader title="Créditos de aula" showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-2xl text-brand-text">Créditos de aula</h1>

        <div className="bg-status-open-bg rounded-xl p-3">
          <p className="text-xs text-status-open-text">
            ⚠️ Esta tela <strong>define</strong> o total de créditos da aluna — não soma ao valor atual.
            Use os botões −/+ para ajustar de 1 em 1, ou os atalhos para definir um valor exato.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Tipo de pacote</label>
          <div className="grid grid-cols-2 gap-2">
            {(['manual', 'torno'] as const).map(t => (
              <button key={t} type="button" onClick={() => setPackageType(t)}
                className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                  packageType === t
                    ? 'border-brand-mauve bg-brand-blush text-brand-mauve'
                    : 'border-brand-line bg-white text-brand-text'
                }`}>
                {t === 'manual' ? 'Manual - R$ 420' : 'Torno - R$ 460'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Créditos disponíveis (total atual)</label>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setCredits(c => c - 1)}
              className="w-12 h-12 rounded-xl border border-brand-line bg-white text-brand-text text-xl font-bold flex items-center justify-center">
              −
            </button>
            <span className="font-display text-4xl text-brand-text w-12 text-center">{credits}</span>
            <button type="button" onClick={() => setCredits(c => c + 1)}
              className="w-12 h-12 rounded-xl border border-brand-line bg-white text-brand-text text-xl font-bold flex items-center justify-center">
              +
            </button>
            <span className="text-sm text-brand-muted">crédito{credits !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-xs text-brand-muted mt-2">Definir total para:</p>
          <div className="flex gap-2">
            {[-4, -2, 0, 4, 8, 12].map(n => (
              <button key={n} type="button" onClick={() => setCredits(n)}
                className="px-3 py-1.5 rounded-lg border border-brand-line bg-white text-xs text-brand-muted hover:border-brand-mauve transition-colors">
                {n}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  )
}