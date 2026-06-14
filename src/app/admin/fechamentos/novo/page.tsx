'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

type Student = { id: string; full_name: string }
type Peca = { id: string; name: string; calculated_value: number; piece_date: string }
type Argila = { id: string; clay_types: { name: string } | null; quantity: number; unit_price: number; total_value: number; sale_date: string }
type Aula = { id: string; slot_id: string; modality: string; schedule_slots: { start_time: string } | null }

const PRECO_MANUAL = 420
const PRECO_TORNO = 460

function NovoFechamentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaParam = searchParams.get('aluna')

  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState(alunaParam ?? '')
  const [pecasAbertas, setPecasAbertas] = useState<Peca[]>([])
  const [argilasAbertas, setArgilasAbertas] = useState<Argila[]>([])
  const [aulasDoMes, setAulasDoMes] = useState<Aula[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => setStudents(students))
  }, [])

  useEffect(() => {
    if (!studentId) {
      setPecasAbertas([])
      setArgilasAbertas([])
      setAulasDoMes([])
      return
    }
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    Promise.all([
      supabase.from('pieces').select('id, name, calculated_value, piece_date')
        .eq('student_id', studentId).eq('status', 'open').order('piece_date'),
      supabase.from('clay_sales').select('id, quantity, unit_price, total_value, sale_date, clay_types(name)')
        .eq('student_id', studentId).eq('status', 'open').order('sale_date'),
      supabase.from('appointments')
        .select('id, slot_id, modality, schedule_slots(start_time)')
        .eq('student_id', studentId)
        .eq('status', 'confirmed')
        .gte('schedule_slots.start_time', mesInicio)
        .lte('schedule_slots.start_time', mesFim),
    ]).then(([{ data: pecas }, { data: argilas }, { data: aulas }]) => {
      setPecasAbertas(pecas ?? [])
      setArgilasAbertas((argilas ?? []) as unknown as Argila[])
      setAulasDoMes((aulas ?? []) as Aula[])
      setLoading(false)
    })
  }, [studentId])

  const totalPecas = pecasAbertas.reduce((sum, p) => sum + p.calculated_value, 0)
  const totalArgila = argilasAbertas.reduce((sum, a) => sum + a.total_value, 0)
  const temTorno = aulasDoMes.some(a => a.modality === 'torno')
  const valorPacote = aulasDoMes.length > 0 ? (temTorno ? PRECO_TORNO : PRECO_MANUAL) : 0
  const totalGeral = totalPecas + totalArgila + valorPacote

  const refMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function handleSubmit() {
    if (!studentId) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: fechamento, error } = await supabase.from('monthly_closings').insert({
      student_id: studentId,
      reference_month: refMonth,
      total_value: totalGeral,
      status: 'awaiting_payment',
      created_by: user.id,
    }).select().single()

    if (error || !fechamento) { setSaving(false); return }

    if (pecasAbertas.length) {
      await supabase.from('closing_items').insert(
        pecasAbertas.map(p => ({ closing_id: fechamento.id, piece_id: p.id, value_snapshot: p.calculated_value }))
      )
      await supabase.from('pieces').update({ status: 'closed' }).in('id', pecasAbertas.map(p => p.id))
    }

    if (argilasAbertas.length) {
      await supabase.from('clay_sales').update({ status: 'closed' }).in('id', argilasAbertas.map(a => a.id))
    }

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
          <>
            {loading ? (
              <div className="h-20 bg-white rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-4">

                {/* Pacote de aulas */}
                <div className="space-y-2">
                  <h2 className="font-display text-base text-brand-text">Pacote do mês</h2>
                  {aulasDoMes.length === 0 ? (
                    <div className="bg-white rounded-xl p-4 text-center shadow-card">
                      <p className="text-sm text-brand-muted">Nenhuma aula este mês.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-brand-text">
                            {aulasDoMes.length} aula{aulasDoMes.length !== 1 ? 's' : ''} — pacote {temTorno ? 'torno' : 'manual'}
                          </p>
                          <p className="text-xs text-brand-muted">
                            {temTorno ? 'Inclui pelo menos 1 aula no torno' : 'Todas as aulas no manual'}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-brand-text">{formatCurrency(valorPacote)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Peças */}
                {pecasAbertas.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="font-display text-base text-brand-text">Peças em aberto</h2>
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
                  </div>
                )}

                {/* Argila */}
                {argilasAbertas.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="font-display text-base text-brand-text">Argila em aberto</h2>
                    <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                      {argilasAbertas.map(a => (
                        <div key={a.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-brand-text">
                              {a.quantity}x {(a.clay_types as any)?.name ?? 'Argila'}
                            </p>
                            <p className="text-xs text-brand-muted">{formatDate(a.sale_date)}</p>
                          </div>
                          <p className="text-sm font-medium text-brand-text">{formatCurrency(a.total_value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="bg-brand-blush rounded-xl p-4 space-y-2">
                  {valorPacote > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-mauve">Pacote {temTorno ? 'torno' : 'manual'}</span>
                      <span className="text-brand-mauve">{formatCurrency(valorPacote)}</span>
                    </div>
                  )}
                  {totalPecas > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-mauve">Peças</span>
                      <span className="text-brand-mauve">{formatCurrency(totalPecas)}</span>
                    </div>
                  )}
                  {totalArgila > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-mauve">Argila</span>
                      <span className="text-brand-mauve">{formatCurrency(totalArgila)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-brand-line pt-2 mt-2">
                    <p className="font-display text-base text-brand-mauve">Total</p>
                    <p className="font-display text-2xl text-brand-mauve">{formatCurrency(totalGeral)}</p>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={saving || totalGeral === 0}
                  className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
                  {saving ? 'Gerando...' : 'Confirmar fechamento'}
                </button>
              </div>
            )}
          </>
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