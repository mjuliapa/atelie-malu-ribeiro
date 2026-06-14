'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type ClayType = { id: string; name: string; price: number }
type Student = { id: string; full_name: string }

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function NovaArgilaPage() {
  const router = useRouter()
  const [clayTypes, setClayTypes] = useState<ClayType[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [clayTypeId, setClayTypeId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students, clayTypes }) => {
        setStudents(students)
        setClayTypes(clayTypes)
        if (clayTypes.length) setClayTypeId(clayTypes[0].id)
      })
  }, [])

  const selectedClay = clayTypes.find(c => c.id === clayTypeId)
  const total = quantity * (selectedClay?.price ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !clayTypeId) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('clay_sales').insert({
      student_id: studentId,
      clay_type_id: clayTypeId,
      quantity,
      unit_price: selectedClay?.price ?? 0,
      sale_date: saleDate,
      notes: notes.trim() || null,
      created_by: user.id,
    })

    setLoading(false)
    if (!error) router.push('/admin/argila')
  }

  return (
    <>
      <AdminNavHeader title="Nova venda de argila" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-5">Nova venda de argila</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Aluna</label>
            {students.length === 0 ? (
              <div className="h-10 bg-brand-cream rounded-xl animate-pulse" />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {students.map(s => (
                  <button key={s.id} type="button" onClick={() => setStudentId(s.id)}
                    className={cn(
                      'px-4 py-3 rounded-xl border text-sm text-left transition-colors',
                      studentId === s.id
                        ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                        : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                    )}>
                    {s.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Tipo de argila</label>
            {clayTypes.length === 0 ? (
              <div className="h-10 bg-brand-cream rounded-xl animate-pulse" />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {clayTypes.map(c => (
                  <button key={c.id} type="button" onClick={() => setClayTypeId(c.id)}
                    className={cn(
                      'px-4 py-3 rounded-xl border text-sm text-left transition-colors flex items-center justify-between',
                      clayTypeId === c.id
                        ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                        : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                    )}>
                    <span>{c.name}</span>
                    <span className={cn('text-xs', clayTypeId === c.id ? 'text-brand-mauve/70' : 'text-brand-muted')}>
                      {formatCurrency(c.price)}/pacote
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Quantidade de pacotes (10kg cada)
            </label>
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
              <span className="text-sm text-brand-muted">{quantity * 10}kg total</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={saleDate} onChange={e => setSaleDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          {total > 0 && (
            <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-brand-mauve mb-0.5">
                  {quantity} pacote{quantity !== 1 ? 's' : ''} × {formatCurrency(selectedClay?.price ?? 0)}
                </p>
                <p className="text-xs text-brand-mauve">{quantity * 10}kg de {selectedClay?.name}</p>
              </div>
              <p className="font-display text-2xl text-brand-mauve">{formatCurrency(total)}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Opcional"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
          </div>

          <button type="submit" disabled={loading || !studentId || !clayTypeId}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {loading ? 'Salvando...' : 'Registrar venda'}
          </button>
        </form>
      </div>
    </>
  )
}