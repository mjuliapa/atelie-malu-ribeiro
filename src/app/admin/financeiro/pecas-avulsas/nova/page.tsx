'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

type Student = { id: string; full_name: string }

const CANAIS = [
  { id: 'aluna', label: 'Aluna', icon: '👩‍🎨' },
  { id: 'loja', label: 'Loja', icon: '🏪' },
  { id: 'site', label: 'Site', icon: '🌐' },
  { id: 'encomenda', label: 'Encomenda', icon: '📦' },
] as const

const FIRING_TYPE_BY_CANAL: Record<string, string> = {
  aluna: 'Venda livre (sem cálculo)',
  loja: 'Venda Loja',
  site: 'Venda Site',
  encomenda: 'Venda Encomenda',
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function NovaPecaAvulsaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaParam = searchParams.get('aluna')

  const [canal, setCanal] = useState<'aluna' | 'loja' | 'site' | 'encomenda'>(alunaParam ? 'aluna' : 'loja')
  const [students, setStudents] = useState<Student[]>([])
  const [firingTypes, setFiringTypes] = useState<{id: string; name: string}[]>([])
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState(alunaParam ?? '')
  const [clienteNome, setClienteNome] = useState('')
  const [name, setName] = useState('')
  const [valor, setValor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [pieceDate, setPieceDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students, firingTypes }) => {
        setStudents(students)
        setFiringTypes(firingTypes)
      })
  }, [])

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const valorNum = parseFloat(valor) || 0
  const valorTotal = valorNum * quantity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canal === 'aluna' && !studentId) return
    if (canal !== 'aluna' && !clienteNome.trim()) return
    if (valorNum <= 0) return

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const firingTypeName = FIRING_TYPE_BY_CANAL[canal]
let firingType = firingTypes.find(f => f.name === firingTypeName)

if (!firingType) {
  const res = await fetch('/api/admin/firing-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: firingTypeName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    alert(err.error ?? 'Erro ao criar tipo de venda. Tente novamente.')
    setLoading(false)
    return
  }
  firingType = await res.json()
}

if (!firingType) {
  alert('Não foi possível identificar o tipo de venda.')
  setLoading(false)
  return
}

    const finalName = canal === 'aluna'
      ? (quantity > 1 ? `${quantity}x ${name.trim()}` : name.trim())
      : `[Cliente: ${clienteNome.trim()}] ${quantity > 1 ? `${quantity}x ` : ''}${name.trim()}`

    // Para canais não-aluna, usa o próprio usuário logado (admin) como student_id —
    // já que a FK exige um profile válido, mas o nome real do cliente fica no campo name
    const studentIdFinal = canal === 'aluna' ? studentId : user.id

    const res = await fetch('/api/admin/pecas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    student_id: studentIdFinal,
    name: finalName,
    height: 1,
    width: 1,
    length: 1,
    firing_type_id: firingType.id,
    coefficient: valorTotal,
    calculated_value: valorTotal,
    piece_date: pieceDate,
    notes: notes.trim() || null,
    created_by: user.id,
  }),
})

setLoading(false)
if (res.ok) {
  router.push(alunaParam ? `/admin/alunos/${alunaParam}` : '/admin/financeiro')
} else {
  const err = await res.json().catch(() => ({}))
  alert(err.error ?? 'Erro ao registrar venda.')
}
  }

  return (
    <>
      <AdminNavHeader title="Venda de peça" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-1">Venda de peça</h1>
        <p className="text-sm text-brand-muted mb-5">Peça avulsa com valor livre, sem cálculo por dimensão.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Canal de venda</label>
            <div className="grid grid-cols-2 gap-2">
              {CANAIS.map(c => (
                <button key={c.id} type="button" onClick={() => setCanal(c.id)}
                  className={cn(
                    'py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                    canal === c.id ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text'
                  )}>
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {canal === 'aluna' ? (
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
          ) : (
            <div>
              <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome do cliente</label>
              <input required value={clienteNome} onChange={e => setClienteNome(e.target.value)}
                placeholder="Nome de quem comprou"
                className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome da peça</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Caneca, Vaso pequeno"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
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
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">
              Valor unitário (R$)
            </label>
            <input type="number" min="0" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={pieceDate} onChange={e => setPieceDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          {valorTotal > 0 && (
            <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
              <p className="text-sm text-brand-mauve">
                {quantity > 1 ? `${quantity}× ${formatCurrency(valorNum)}` : 'Total'}
              </p>
              <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valorTotal)}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Opcional"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
          </div>

          <button type="submit"
            disabled={loading || !name || valorNum <= 0 || (canal === 'aluna' ? !studentId : !clienteNome.trim())}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {loading ? 'Salvando...' : 'Registrar venda'}
          </button>
        </form>
      </div>
    </>
  )
}

export default function NovaPecaAvulsaPage() {
  return (
    <Suspense>
      <NovaPecaAvulsaContent />
    </Suspense>
  )
}