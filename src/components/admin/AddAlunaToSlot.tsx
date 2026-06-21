'use client'

import { useState, useEffect } from 'react'

type Student = { id: string; full_name: string }

export function AddAlunaToSlot({ slotId, onAdded }: { slotId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [modality, setModality] = useState<'manual' | 'torno'>('manual')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && students.length === 0) {
      fetch('/api/admin/form-data')
        .then(r => r.json())
        .then(({ students }) => setStudents(students))
    }
  }, [open])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd() {
    if (!selectedId) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: slotId,
        student_id: selectedId,
        status: 'confirmed',
        modality,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Não foi possível adicionar.')
      return
    }

    setOpen(false)
    setSelectedId('')
    setSearch('')
    onAdded()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full py-3 bg-white text-brand-mauve border border-brand-mauve rounded-xl font-medium text-sm hover:bg-brand-blush transition-colors">
        + Adicionar aluna a esta aula
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-text">Adicionar aluna</p>
        <button onClick={() => setOpen(false)} className="text-xs text-brand-muted">Cancelar</button>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar aluna..."
        className="w-full px-4 py-2.5 rounded-xl border border-brand-line bg-brand-cream text-brand-text text-sm focus:outline-none focus:border-brand-mauve" />

      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {filtered.map(s => (
          <button key={s.id} type="button" onClick={() => setSelectedId(s.id)}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm text-left transition-colors ${
              selectedId === s.id
                ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
            }`}>
            {s.full_name}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-brand-muted text-center py-3">Nenhuma aluna encontrada.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['manual', 'torno'] as const).map(m => (
          <button key={m} type="button" onClick={() => setModality(m)}
            className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              modality === m ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text'
            }`}>
            {m === 'manual' ? '✋ Manual' : '🏺 Torno'}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-status-open-text bg-status-open-bg rounded-lg px-3 py-2">{error}</p>}

      <button onClick={handleAdd} disabled={saving || !selectedId}
        className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
        {saving ? 'Adicionando...' : 'Confirmar'}
      </button>
    </div>
  )
}