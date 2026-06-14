'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

type Student = { id: string; full_name: string }
type Peca = { id: string; name: string; calculated_value: number; piece_date: string }

function NovoFechamentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaParam = searchParams.get('aluna')

  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState(alunaParam ?? '')
  const [pecasAbertas, setPecasAbertas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => setStudents(students))
  }, [])

  useEffect(() => {
    if (!studentId) { setPecasAbertas([]); return }
    setLoading(true)
    const supabase = createClient()
    supabase.from('pieces').select('id, name, calculated_value, piece_date')
      .eq('student_id', studentId).eq('status', 'open').order('piece_date')
      .then(({ data }) => { setPecasAbertas(data ?? []); setLoading(false) })
  }, [studentId])

  const total = pecasAbertas.reduce((sum, p) => sum + p.calculated_value, 0)
  const refMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function handleSubmit() {
    if (!studentId || !pecasAbertas.length) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: fechamento, error } = await supabase.from('monthly_closings').insert({
      student_id: studentId,
      reference_month: refMonth,
      total_value: total,
      status: 'awaiting_payment',
      created_by: user.id,
    }).select().single()

    if (error || !fechamento) { setSaving(false); return }

    await supabase.from('closing_items').insert(
      pecasAbertas.map(p => ({ closing_id: fechamento.id, piece_id: p.id, value_snapshot: p.calculated_value }))
    )

    await supabase.from('pieces').update({ status: 'closed' })
      .in('id', pecasAbertas.map(p => p.id))

    setSaving(false)
    router.push(`/admin/fechamentos/${fechamento.id}`)
  }

  return (
    <>
      <AdminNavHeader title="Novo fechamento" showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-2xl text-brand-text">Novo fechamento</h1>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Aluna</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve">
            <option value="">Selecione a aluna</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>

        {studentId && (
          <div className="space-y-3">
            <h2 className="font-display text-base text-brand-text">Peças em aberto</h2>

            {loading ? (
              <div className="h-20 bg-white rounded-xl animate-pulse" />
            ) : pecasAbertas.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center shadow-card">
                <p className="text-sm text-brand-muted">Nenhuma peça em aberto para esta aluna.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                  {pecasAbertas.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-brand-text">{p.name}</p>
                        <p className="text-xs text-brand-muted">{formatDate(p.piece_date)}</p>
                      </div>
                      <p className="text-sm font-medium text-brand-text">{formatCurrency(p.calculated_value)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
                  <p className="font-display text-base text-brand-mauve">Total</p>
                  <p className="font-display text-2xl text-brand-mauve">{formatCurrency(total)}</p>
                </div>

                <button onClick={handleSubmit} disabled={saving}
                  className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
                  {saving ? 'Gerando...' : 'Confirmar fechamento'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function NovoFechamentoPage() {
  return (
    <Suspense>
      <NovoFechamentoContent />
    </Suspense>
  )
}