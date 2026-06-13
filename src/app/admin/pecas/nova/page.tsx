'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

type FiringType = { id: string; name: string; coefficient: number }
type Student = { id: string; full_name: string }

export default function NovaPecaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunaParam = searchParams.get('aluna')

  const [students, setStudents] = useState<Student[]>([])
  const [firingTypes, setFiringTypes] = useState<FiringType[]>([])
  const [loading, setLoading] = useState(false)

  const [studentId, setStudentId] = useState(alunaParam ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [height, setHeight] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [firingTypeId, setFiringTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [pieceDate, setPieceDate] = useState(new Date().toISOString().split('T')[0])

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: f }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('role', 'student').eq('status', 'active').order('full_name'),
        supabase.from('firing_types').select('*').eq('is_active', true).order('name'),
      ])
      setStudents(s ?? [])
      setFiringTypes(f ?? [])
      if (f?.length && !firingTypeId) setFiringTypeId(f[0].id)
    }
    load()
  }, [])

  const h = parseFloat(height) || 0
  const w = parseFloat(width) || 0
  const l = parseFloat(length) || 0
  const volume = h * w * l
  const selectedFiring = firingTypes.find(f => f.id === firingTypeId)
  const valor = volume * (selectedFiring?.coefficient ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !firingTypeId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('pieces').insert({
      student_id: studentId,
      name: name.trim(),
      description: description.trim() || null,
      height: h,
      width: w,
      length: l,
      firing_type_id: firingTypeId,
      coefficient: selectedFiring?.coefficient ?? 0,
      calculated_value: valor,
      piece_date: pieceDate,
      notes: notes.trim() || null,
      created_by: user.id,
    })

    setLoading(false)
    if (!error) {
      router.push(alunaParam ? `/admin/alunos/${alunaParam}` : '/admin/pecas')
    }
  }

  return (
    <>
      <AdminNavHeader title="Nova peça" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-5">Nova peça</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Aluna */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Aluna</label>
            <select required value={studentId} onChange={e => setStudentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve">
              <option value="">Selecione a aluna</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome da peça</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Vaso decorativo"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          {/* Data */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={pieceDate} onChange={e => setPieceDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          {/* Dimensões */}
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
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-brand-line bg-white text-brand-text text-center focus:outline-none focus:border-brand-mauve" />
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de queima */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Tipo de queima</label>
            <select required value={firingTypeId} onChange={e => setFiringTypeId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve">
              {firingTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* Calculadora */}
          {volume > 0 && (
            <div className="bg-brand-blush rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium tracking-widest uppercase text-brand-mauve">Cálculo automático</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-brand-muted">Volume</p>
                  <p className="font-medium text-brand-text">{volume.toFixed(0)} cm³</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Coeficiente</p>
                  <p className="font-medium text-brand-text">{selectedFiring?.coefficient}</p>
                </div>
              </div>
              <div className="border-t border-brand-line pt-2 flex justify-between items-center">
                <p className="text-sm text-brand-muted">Valor calculado</p>
                <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valor)}</p>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Opcional"
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
          </div>

          <button type="submit" disabled={loading || !studentId || !name || !firingTypeId || volume === 0}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {loading ? 'Salvando...' : 'Cadastrar peça'}
          </button>
        </form>
      </div>
    </>
  )
}
