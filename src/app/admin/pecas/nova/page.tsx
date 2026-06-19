'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

type FiringType = { id: string; name: string; coefficient: number }
type Student = { id: string; full_name: string }

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function NovaQueimaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaParam = searchParams.get('aluna')

  const [students, setStudents] = useState<Student[]>([])
  const [firingTypes, setFiringTypes] = useState<FiringType[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState(alunaParam ?? '')
  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [firingTypeId, setFiringTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [pieceDate, setPieceDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students, firingTypes }) => {
        setStudents(students)
        setFiringTypes(firingTypes)
        if (firingTypes.length) setFiringTypeId(firingTypes[0].id)
      })
  }, [])

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const h = parseFloat(height) || 0
  const w = parseFloat(width) || 0
  const l = parseFloat(length) || 0
  const volume = h * w * l
  const selectedFiring = firingTypes.find(f => f.id === firingTypeId)
  const valorUnitario = volume * (selectedFiring?.coefficient ?? 0)
  const valorTotal = valorUnitario * quantity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !firingTypeId) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Guarda quantidade no campo notes com prefixo estruturado
    // (sem precisar de coluna nova no banco)
    const notesComQuantidade = quantity > 1
      ? `qty:${quantity}|${notes.trim()}`
      : notes.trim()

    const finalName = quantity > 1 ? `${quantity}x ${name.trim()}` : name.trim()

    const { error } = await supabase.from('pieces').insert({
      student_id: studentId,
      name: finalName,
      height: h,
      width: w,
      length: l,
      firing_type_id: firingTypeId,
      coefficient: selectedFiring?.coefficient ?? 0,
      calculated_value: valorTotal,
      piece_date: pieceDate,
      notes: notesComQuantidade || null,
      created_by: user.id,
    })

    setLoading(false)
    if (!error) {
      router.push(alunaParam ? `/admin/alunos/${alunaParam}` : '/admin/pecas')
    }
  }

  return (
    <>
      <AdminNavHeader title="Nova queima" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-5">Nova queima</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Aluna</label>
            {students.length === 0 ? (
              <p className="text-sm text-brand-muted">Nenhuma aluna cadastrada ainda.</p>
            ) : (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar aluna..."
                  className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {filteredStudents.map(s => (
                    <button key={s.id} type="button" onClick={() => setStudentId(s.id)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border text-sm text-left transition-colors',
                        studentId === s.id
                          ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                          : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                      )}>
                      {s.full_name}
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-sm text-brand-muted text-center py-3">Nenhuma aluna encontrada.</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome da peça</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Copo, Vaso decorativo"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
            {quantity > 1 && (
              <p className="text-xs text-brand-muted mt-1">Vai aparecer como: "{quantity}x {name || '...'}"</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Quantidade</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl border border-brand-line bg-white text-brand-text text-lg font-medium hover:border-brand-mauve transition-colors">
                −
              </button>
              <span className="font-display text-2xl text-brand-text min-w-[2rem] text-center">{quantity}</span>
              <button type="button" onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-xl border border-brand-line bg-white text-brand-text text-lg font-medium hover:border-brand-mauve transition-colors">
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={pieceDate} onChange={e => setPieceDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Dimensões (cm) {quantity > 1 ? '— de cada peça' : ''}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Altura', value: height, set: setHeight },
                { label: 'Largura', value: width, set: setWidth },
                { label: 'Comprimento', value: length, set: setLength },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <p className="text-[10px] text-brand-muted mb-1">{label}</p>
                  <input type="number" min="0" step="0.1" value={value} onChange={e => set(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-line bg-white text-brand-text text-center focus:outline-none focus:border-brand-mauve" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Tipo de queima</label>
            {firingTypes.length === 0 ? (
              <div className="h-10 bg-brand-cream rounded-xl animate-pulse" />
            ) : (
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
            )}
          </div>

          {volume > 0 && (
            <div className="bg-brand-blush rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium tracking-widest uppercase text-brand-mauve">Cálculo automático</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-brand-muted">Volume (1 peça)</p>
                  <p className="font-medium text-brand-text">{volume.toFixed(0)} cm³</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Coeficiente</p>
                  <p className="font-medium text-brand-text">{selectedFiring?.coefficient}</p>
                </div>
              </div>
              {quantity > 1 && (
                <div className="flex justify-between items-center text-sm border-t border-brand-line pt-2">
                  <p className="text-brand-muted">Valor unitário</p>
                  <p className="font-medium text-brand-text">{formatCurrency(valorUnitario)}</p>
                </div>
              )}
              <div className="border-t border-brand-line pt-2 flex justify-between items-center">
                <p className="text-sm text-brand-muted">
                  Valor total {quantity > 1 ? `(${quantity}× peças)` : ''}
                </p>
                <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valorTotal)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Opcional"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
          </div>

          <button type="submit" disabled={loading || !studentId || !name || !firingTypeId || volume === 0}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {loading ? 'Salvando...' : 'Cadastrar queima'}
          </button>
        </form>
      </div>
    </>
  )
}

export default function NovaQueimaPage() {
  return (
    <Suspense>
      <NovaQueimaContent />
    </Suspense>
  )
}