'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'

type FiringType = { id: string; name: string; coefficient: number }

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function EditarPecaPage() {
  const { id } = useParams()
  const router = useRouter()

  const [firingTypes, setFiringTypes] = useState<FiringType[]>([])
  const [studentName, setStudentName] = useState('')
  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [firingTypeId, setFiringTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [pieceDate, setPieceDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/pecas?id=${id}`).then(r => r.json()),
      fetch('/api/admin/form-data').then(r => r.json()),
    ]).then(([peca, formData]) => {
      setName(peca.name)
      setHeight(String(peca.height))
      setWidth(String(peca.width))
      setLength(String(peca.length))
      setFiringTypeId(peca.firing_type_id)
      setNotes(peca.notes ?? '')
      setPieceDate(peca.piece_date)
      setStudentName((peca.profiles as any)?.full_name ?? '')
      setFiringTypes(formData.firingTypes)
      setLoading(false)
    })
  }, [id])

  const h = parseFloat(height) || 0
  const w = parseFloat(width) || 0
  const l = parseFloat(length) || 0
  const volume = h * w * l
  const selectedFiring = firingTypes.find(f => f.id === firingTypeId)
  const valor = volume * (selectedFiring?.coefficient ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch(`/api/admin/pecas?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        height: h,
        width: w,
        length: l,
        firing_type_id: firingTypeId,
        coefficient: selectedFiring?.coefficient ?? 0,
        calculated_value: valor,
        piece_date: pieceDate,
        notes: notes.trim() || null,
      }),
    })

    setSaving(false)
    if (res.ok) router.push('/admin/pecas')
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>

  return (
    <>
      <AdminNavHeader title="Editar peça" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-1">Editar peça</h1>
        <p className="text-sm text-brand-muted mb-5">{studentName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome da peça</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={pieceDate} onChange={e => setPieceDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Dimensões (cm)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Altura', value: height, set: setHeight },
                { label: 'Largura', value: width, set: setWidth },
                { label: 'Comprimento', value: length, set: setLength },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <p className="text-[10px] text-brand-muted mb-1">{label}</p>
                  <input type="number" min="0" step="0.1" value={value} onChange={e => set(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-line bg-white text-brand-text text-center focus:outline-none focus:border-brand-mauve" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Tipo de queima</label>
            <div className="grid grid-cols-1 gap-2">
              {firingTypes.map(f => (
                <button key={f.id} type="button" onClick={() => setFiringTypeId(f.id)}
                  className={cn(
                    'px-4 py-3 rounded-xl border text-sm text-left transition-colors flex items-center justify-between',
                    firingTypeId === f.id
                      ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                      : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                  )}>
                  <span>{f.name}</span>
                  <span className={cn('text-xs', firingTypeId === f.id ? 'text-brand-mauve/70' : 'text-brand-muted')}>
                    coef. {f.coefficient}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {volume > 0 && (
            <div className="bg-brand-blush rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium tracking-widest uppercase text-brand-mauve">Cálculo automático</p>
              <div className="border-t border-brand-line pt-2 flex justify-between items-center">
                <p className="text-sm text-brand-muted">Novo valor</p>
                <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valor)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
          </div>

          <button type="submit" disabled={saving || !name || !firingTypeId || volume === 0}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </>
  )
}