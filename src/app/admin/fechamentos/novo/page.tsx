'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

type Student = { id: string; full_name: string }
type Peca = { id: string; name: string; calculated_value: number; piece_date: string }
type Argila = { id: string; clay_types: { name: string } | null; quantity: number; unit_price: number; total_value: number; sale_date: string }
type PackageCharge = { id: string; package_type: string; credits: number; value: number }

function NovoFechamentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaParam = searchParams.get('aluna')

  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState(alunaParam ?? '')
  const [pecasAbertas, setPecasAbertas] = useState<Peca[]>([])
  const [argilasAbertas, setArgilasAbertas] = useState<Argila[]>([])
  const [pacotesPendentes, setPacotesPendentes] = useState<PackageCharge[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [incluirPecas, setIncluirPecas] = useState(true)
  const [incluirArgila, setIncluirArgila] = useState(true)
  const [incluirPacotes, setIncluirPacotes] = useState(true)
  const [creditosNegativos, setCreditosNegativos] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => setStudents(students))
  }, [])

  useEffect(() => {
    if (!studentId) { setCreditosNegativos(null); return }
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => {
        const aluna = students.find((s: any) => s.id === studentId)
        const credits = aluna?.credits ?? 0
        setCreditosNegativos(credits < 0 ? credits : null)
      })
  }, [studentId])

  useEffect(() => {
    if (!studentId) {
      setPecasAbertas([])
      setArgilasAbertas([])
      setPacotesPendentes([])
      return
    }
    setLoading(true)

    Promise.all([
      fetch(`/api/admin/pecas?student_id=${studentId}&status=open`).then(r => r.json()),
      fetch(`/api/admin/argila?student_id=${studentId}&status=open`).then(r => r.json()),
      fetch(`/api/admin/package-charges?student_id=${studentId}&status=awaiting_payment`).then(r => r.json()),
    ]).then(([pecas, argilas, pacotes]) => {
      setPecasAbertas(pecas as Peca[])
      setArgilasAbertas(argilas as Argila[])
      setPacotesPendentes(Array.isArray(pacotes) ? pacotes as PackageCharge[] : [])
      setLoading(false)
    })
  }, [studentId])

  const totalPecas = incluirPecas ? pecasAbertas.reduce((sum, p) => sum + p.calculated_value, 0) : 0
  const totalArgila = incluirArgila ? argilasAbertas.reduce((sum, a) => sum + a.total_value, 0) : 0
  const totalPacotes = incluirPacotes ? pacotesPendentes.reduce((sum, p) => sum + p.value, 0) : 0
  const totalGeral = totalPecas + totalArgila + totalPacotes

  const refMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function handleSubmit() {
    if (!studentId) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/admin/fechamentos/criar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        reference_month: refMonth,
        total_value: totalGeral,
        created_by: user?.id,
        pecas: incluirPecas ? pecasAbertas.map(p => ({ id: p.id, value_snapshot: p.calculated_value })) : [],
        argilas: incluirArgila ? argilasAbertas.map(a => ({ id: a.id, value_snapshot: a.total_value })) : [],
        pacotes: incluirPacotes ? pacotesPendentes.map(p => ({ id: p.id, value_snapshot: p.value })) : [],
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao criar fechamento:', err)
      return
    }
    const data = await res.json()
    router.push(`/admin/fechamentos/${data.id}`)
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

        {creditosNegativos !== null && (
          <div className="bg-status-open-bg rounded-xl p-3 flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-status-open-text">
              Esta aluna deve <strong>{Math.abs(creditosNegativos)} aula{Math.abs(creditosNegativos) !== 1 ? 's' : ''}</strong> (crédito negativo). Gere uma cobrança de pacote para incluir essa dívida no fechamento.
            </p>
          </div>
        )}

        {studentId && (
          <>
            {loading ? (
              <div className="h-20 bg-white rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-4">

                {pacotesPendentes.length > 0 && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={incluirPacotes} onChange={e => setIncluirPacotes(e.target.checked)}
                        className="w-4 h-4 accent-brand-mauve" />
                      <h2 className="font-display text-base text-brand-text">Pacotes pendentes</h2>
                    </label>
                    <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                      {pacotesPendentes.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-brand-text">
                              Pacote {p.package_type === 'torno' ? 'torno' : 'manual'}
                            </p>
                            <p className="text-xs text-brand-muted">{p.credits} créditos</p>
                          </div>
                          <p className="text-sm font-medium text-brand-text">{formatCurrency(p.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pecasAbertas.length > 0 && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={incluirPecas} onChange={e => setIncluirPecas(e.target.checked)}
                        className="w-4 h-4 accent-brand-mauve" />
                      <h2 className="font-display text-base text-brand-text">Peças em aberto</h2>
                    </label>
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

                {argilasAbertas.length > 0 && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={incluirArgila} onChange={e => setIncluirArgila(e.target.checked)}
                        className="w-4 h-4 accent-brand-mauve" />
                      <h2 className="font-display text-base text-brand-text">Argila em aberto</h2>
                    </label>
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

                {totalGeral === 0 && (
                  <div className="bg-white rounded-xl p-4 text-center shadow-card">
                    <p className="text-sm text-brand-muted">Nenhum item em aberto para esta aluna.</p>
                  </div>
                )}

                <div className="bg-brand-blush rounded-xl p-4 space-y-2">
                  {totalPacotes > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-mauve">Pacotes</span>
                      <span className="text-brand-mauve">{formatCurrency(totalPacotes)}</span>
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