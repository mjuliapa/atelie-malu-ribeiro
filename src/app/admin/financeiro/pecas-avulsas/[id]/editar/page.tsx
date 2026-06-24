'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter, useParams } from 'next/navigation'

const CANAL_NOME: Record<string, string> = {
  'Venda livre (sem calculo)': 'Aluna',
  'Venda Loja': 'Loja',
  'Venda Site': 'Site',
  'Venda Encomenda': 'Encomenda',
}

function semAcento(s: string) {
  return s?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function EditarPecaAvulsaPage() {
  const router = useRouter()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [canal, setCanal] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [name, setName] = useState('')
  const [valor, setValor] = useState('')
  const [pieceDate, setPieceDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/pecas?id=${id}`)
      .then(r => r.json())
      .then(p => {
        const canalNome = Object.entries(CANAL_NOME).find(
          ([n]) => semAcento(n) === semAcento(p.firing_types?.name ?? '')
        )?.[1] ?? 'Aluna'
        setCanal(canalNome)

        let nomeBase = p.name ?? ''
        const match = nomeBase.match(/^\[Cliente: (.+?)\]\s*/)
        if (match) {
          setClienteNome(match[1])
          nomeBase = nomeBase.replace(match[0], '')
        }
        nomeBase = nomeBase.replace(/^\d+x\s*/, '')
        setName(nomeBase)

        setValor(String(p.calculated_value ?? 0))
        setPieceDate((p.piece_date ?? '').split('T')[0])
        setNotes(p.notes ?? '')
        setLoading(false)
      })
  }, [id])

  const valorNum = parseFloat(valor) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (valorNum <= 0) return
    setSaving(true)

    const finalName = canal === 'Aluna'
      ? name.trim()
      : `[Cliente: ${clienteNome.trim()}] ${name.trim()}`

    const res = await fetch(`/api/admin/pecas?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: finalName,
        coefficient: valorNum,
        calculated_value: valorNum,
        piece_date: pieceDate,
        notes: notes.trim() || null,
      }),
    })

    setSaving(false)
    if (res.ok) {
      router.push('/admin/financeiro/pecas-avulsas')
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Erro ao salvar.')
    }
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>

  return (
    <>
      <AdminNavHeader title="Editar venda" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-1">Editar venda</h1>
        <p className="text-sm text-brand-muted mb-5">Canal: {canal}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {canal !== 'Aluna' && (
            <div>
              <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome do cliente</label>
              <input required value={clienteNome} onChange={e => setClienteNome(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Nome da peça</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Valor total (R$)</label>
            <input type="number" min="0" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
            <input type="date" required value={pieceDate} onChange={e => setPieceDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
          </div>

          {valorNum > 0 && (
            <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
              <p className="text-sm text-brand-mauve">Total</p>
              <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valorNum)}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
          </div>

          <button type="submit" disabled={saving || valorNum <= 0}
            className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </>
  )
}